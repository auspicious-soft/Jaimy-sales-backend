export const httpStatusCode = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
}

export function getCountryFromNumber(phoneNumber: any): any {
  const countryCodes: { [key: string]: string } = {
    "+44": "UK",
    "+33": "France",
    "+34": "Spain",
    "+31": "Netherlands",
    "+32": "Belgium",
    "+91": "India"
  };

  for (const code in countryCodes) {
    if (phoneNumber.startsWith(code)) {
      return countryCodes[code];
    }
  }

  return "Unknown country";
}