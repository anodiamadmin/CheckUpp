export type BookingStatus = "required" | "started" | "confirmed";
export type BookingChannel = "hotdoc" | "phone" | "email";

export type BookingStatusDetails = {
  appointmentAt?: string;
  bookedAt?: string;
  providerName?: string;
  notes?: string;
};

export type ScreeningResultRecord = {
  date: string;
  result: string;
  bookingStatus?: BookingStatus;
  bookingChannel?: BookingChannel;
  bookingUpdatedAt?: string;
  bookingConfirmedAt?: string;
  appointmentAt?: string;
  bookedAt?: string;
  providerName?: string;
  notes?: string;
};

export const BOOKING_REQUIRED_RESULT =
  "Please book an appointment with your doctor to discuss testing";

export const getBookingStatus = (
  record?: ScreeningResultRecord | null,
): BookingStatus | null => {
  if (!record) return null;
  if (record.bookingStatus) return record.bookingStatus;
  if (record.result.toLowerCase().includes("please book an appointment")) {
    return "required";
  }
  return null;
};

export const isBookingRequired = (record?: ScreeningResultRecord | null) => {
  const status = getBookingStatus(record);
  return status === "required" || status === "started";
};

export const getBookingStatusLabel = (
  record?: ScreeningResultRecord | null,
) => {
  const status = getBookingStatus(record);
  if (status === "required") return "Requires booking";
  if (status === "started") return "Booking in progress";
  if (status === "confirmed") return "Booked";
  return null;
};
