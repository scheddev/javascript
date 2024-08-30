import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

export const updateValidDays = (availabilities) => {
  const validDatesSet = new Set();
  availabilities.forEach((availability) => {
    const dateStr = format(
      zonedTimeToUtc(availability.start, "UTC"),
      "yyyy-MM-dd"
    );
    validDatesSet.add(dateStr);
  });
  return Array.from(validDatesSet);
};
