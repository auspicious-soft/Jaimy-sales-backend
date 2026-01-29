
import dayjs from "dayjs";
import { contactsModel } from "src/models/contacts-schema";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";

interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  country?: string;
  source?: "hubspot" | "manual" | "api";
  adminPhone?: string;
}

export const getDashboardData = async (filters: DashboardFilters) => {
  const weekStart = dayjs().startOf("week").toDate(); // Sunday
  const weekEnd = dayjs().endOf("week").toDate(); // Saturday
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

  //TODO: UPDATE ON BASES OF THE STATUS OF THE CHATS
  const activeChats = await contactsModel.countDocuments(
    { lastMessageSentAt: { $gte: dayjs().subtract(7, "day").toDate() }, lastMessageReceivedAt: { $gte: dayjs().subtract(7, "day").toDate() } }
  );

  const replyRateAgg = await contactsModel.aggregate([
  {
    $group: {
      _id: null,
      totalContacts: { $sum: 1 },
      receivedCount: {
        $sum: {
          $cond: [
            { $ifNull: ["$lastMessageReceivedAt", false] },
            1,
            0,
          ],
        },
      },
    },
  },
]);

const { totalContacts = 0, receivedCount = 0 } = replyRateAgg[0] || {};

const replyRate =
  totalContacts === 0
    ? 0
    : Math.round((receivedCount / totalContacts) * 100);

  /* ---------------- Growth ---------------- */

 const last6MonthsStart = dayjs().subtract(6, "month").startOf("month").toDate();
const prev6MonthsStart = dayjs().subtract(12, "month").startOf("month").toDate();

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
  {
    $match: {
      ...applicantQuery,
      createdAt: {
        $gte: weekStart,
        $lte: weekEnd,
      },
    },
  },
  {
    $group: {
      _id: { $dayOfWeek: "$createdAt" },
      count: { $sum: 1 },
    },
  },
]);

 const weekMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// const applicantsPerWeek = weekMap.map((day, index) => ({
//   day,
//   count:
//     applicantsPerWeekAgg.find((d) => d._id === index + 1)?.count || 0,
// }));
const applicantsPerWeek = weekMap.map((label, index) => ({
  label,
  value:
    applicantsPerWeekAgg.find((d) => d._id === index + 1)?.count || 0,
}));

const replyTimeAgg = await contactsModel.aggregate([
  {
    $match: {
      lastMessageReceivedAt: { $exists: true },
      lastMessageSentAt: { $exists: true },
      $expr: {
        $gt: ["$lastMessageSentAt", "$lastMessageReceivedAt"],
      },
    },
  },
  {
    $project: {
      replyTimeHours: {
        $divide: [
          { $subtract: ["$lastMessageSentAt", "$lastMessageReceivedAt"] },
          1000 * 60 * 60,
        ],
      },
    },
  },
  {
    $bucket: {
      groupBy: "$replyTimeHours",
      boundaries: [0, 6, 12, 24, 48, 100000],
      output: {
        count: { $sum: 1 },
      },
    },
  },
]);

// const replyTimeAgg = await contactsModel.aggregate([
//   {
//     $match: {
//       lastMessageReceivedAt: { $exists: true },
//       lastMessageSentAt: { $exists: true },
//       $expr: {
//         $gt: ["$lastMessageSentAt", "$lastMessageReceivedAt"],
//       },
//     },
//   },
//   {
//     $project: {
//       replyTimeHours: {
//         $divide: [
//           { $subtract: ["$lastMessageSentAt", "$lastMessageReceivedAt"] },
//           1000 * 60 * 60, // ms → hours
//         ],
//       },
//     },
//   },
//   {
//     $bucket: {
//       groupBy: "$replyTimeHours",
//       boundaries: [0, 6, 12, 24, 48, 100000],
//       default: "48+ hrs",
//       output: {
//         count: { $sum: 1 },
//       },
//     },
//   },
// ]);

//  const replyBucketMap: Record<string, string> = {
//   "0": "0–6 hrs",
//   "6": "6–12 hrs",
//   "12": "12–24 hrs",
//   "24": "24–48 hrs",
//   "48": "48+ hrs",
// };

// const averageReplyTime = [
//   { bucket: "0–6 hrs", count: 0 },
//   { bucket: "6–12 hrs", count: 0 },
//   { bucket: "12–24 hrs", count: 0 },
//   { bucket: "24–48 hrs", count: 0 },
//   { bucket: "48+ hrs", count: 0 },
// ];

// replyTimeAgg.forEach((item) => {
//   const label = replyBucketMap[String(item._id)];
//   if (!label) return;

//   const bucket = averageReplyTime.find((b) => b.bucket === label);
//   if (bucket) bucket.count = item.count;
// });
const replyBucketMap: Record<string, string> = {
  "0": "6 hrs",
  "6": "12 hrs",
  "12": "24",
  "24": "48",
  "48": "48+",
};

const averageReplyTime = [
  { label: "6 hrs", value: 0 },
  { label: "12 hrs", value: 0 },
  { label: "24", value: 0 },
  { label: "48", value: 0 },
  { label: "48+", value: 0 },
];

replyTimeAgg.forEach((item) => {
  const label = replyBucketMap[String(item._id)];
  if (!label) return;

  const bucket = averageReplyTime.find((b) => b.label === label);
  if (bucket) bucket.value = item.count;
});

const currentMonth = dayjs();
const months = [
  currentMonth.subtract(2, "month"),
  currentMonth.subtract(1, "month"),
  currentMonth,
];

const applicantsPerMonthAgg = await hubspotContactModel.aggregate([
  {
    $match: {
      ...applicantQuery,
      createdAt: {
        $gte: months[0].startOf("month").toDate(),
        $lte: months[2].endOf("month").toDate(),
      },
    },
  },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
]);
const monthData = months.map((month, index) => {
  const monthNumber = month.month() + 1; // dayjs is 0-based
  const yearNumber = month.year();

  const found = applicantsPerMonthAgg.find(
    (d) => d._id.month === monthNumber && d._id.year === yearNumber
  );

  return {
    label: month.format("MMM"),
    value: found?.count || 0,
    ...(index === 2 ? { active: true } : {}),
  };
});

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
      monthData
    },
  };
};
