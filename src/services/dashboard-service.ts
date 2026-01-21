
import dayjs from "dayjs";
import { contactsModel } from "src/models/contacts-schema";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";
import { messagesModel } from "src/models/messages-schema";

interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  country?: string;
  source?: "hubspot" | "manual" | "api";
  adminPhone?: string;
}

export const getDashboardData = async (filters: DashboardFilters) => {
  const dateFilter: any = {};

  if (filters.startDate) {
    dateFilter.$gte = dayjs(filters.startDate).startOf("day").toDate();
  }
  if (filters.endDate) {
    dateFilter.$lte = dayjs(filters.endDate).endOf("day").toDate();
  }

  /* ---------------- Applicants Query ---------------- */

  const applicantQuery: any = {};

  if (Object.keys(dateFilter).length) {
    applicantQuery.createdAt = dateFilter;
  }

  if (filters.country) {
    applicantQuery.country = filters.country;
  }

  if (filters.source) {
    applicantQuery.source = filters.source;
  }

  /* ---------------- Message Query ---------------- */

  const messageQuery: any = {};

  if (Object.keys(dateFilter).length) {
    messageQuery.timestamp = dateFilter;
  }

  if (filters.adminPhone) {
    messageQuery.to = filters.adminPhone;
  }

  /* ---------------- Stats ---------------- */

  const newApplicantsToday = await hubspotContactModel.countDocuments({
    ...applicantQuery,
    createdAt: {
      $gte: dayjs().startOf("day").toDate(),
      $lte: dayjs().endOf("day").toDate(),
    },
  });

  const applicantsLast7Days = await hubspotContactModel.countDocuments({
    ...applicantQuery,
    createdAt: { $gte: dayjs().subtract(7, "day").toDate() },
  });

  const activeChats = await contactsModel.countDocuments(
    filters.adminPhone
      ? { phoneNumber: filters.adminPhone }
      : {}
  );

  const totalInbound = await messagesModel.countDocuments({
    ...messageQuery,
    direction: "inbound",
  });

  const repliedOutbound = await messagesModel.countDocuments({
    ...messageQuery,
    direction: "outbound",
    status: { $in: ["sent", "delivered", "read"] },
  });

  const replyRate =
    totalInbound === 0
      ? 0
      : Math.round((repliedOutbound / totalInbound) * 100);

  /* ---------------- Growth ---------------- */

  const last6MonthsStart = dayjs().subtract(6, "month").toDate();
  const prev6MonthsStart = dayjs().subtract(12, "month").toDate();

  const applicantsLast6Months = await hubspotContactModel.countDocuments({
    ...applicantQuery,
    createdAt: { $gte: last6MonthsStart },
  });

  const applicantsPrev6Months = await hubspotContactModel.countDocuments({
    ...applicantQuery,
    createdAt: {
      $gte: prev6MonthsStart,
      $lt: last6MonthsStart,
    },
  });

  const applicantsGrowthPercent =
    applicantsPrev6Months === 0
      ? 100
      : Math.round(
          ((applicantsLast6Months - applicantsPrev6Months) /
            applicantsPrev6Months) *
            100
        );

  /* ---------------- Charts ---------------- */

  const applicantsPerWeekAgg = await hubspotContactModel.aggregate([
      { $match: applicantQuery },
      {
          $group: {
              _id: { $dayOfWeek: "$createdAt" },
              count: { $sum: 1 },
            },
        },
    ]);
    console.log('applicantsPerWeekAgg: ', applicantsPerWeekAgg);

  const weekMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const applicantsPerWeek = weekMap.map((day, index) => ({
    day,
    count:
      applicantsPerWeekAgg.find((d) => d._id === index + 1)?.count || 0,
  }));

  const averageReplyTime = [
    { bucket: "0–6 hrs", count: 0 },
    { bucket: "6–12 hrs", count: 0 },
    { bucket: "12–24 hrs", count: 0 },
    { bucket: "24–48 hrs", count: 0 },
    { bucket: "48+ hrs", count: 0 },
  ];

  return {
    stats: {
      newApplicantsToday,
      applicantsLast7Days,
      replyRate,
      activeChats,
      applicantsGrowthPercent,
    },
    charts: {
      applicantsPerWeek,
      averageReplyTime,
    },
  };
};
