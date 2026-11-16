// Enquiry model — the gym's inbox of questions, callback requests and complaints (`/api/v1/enquiries/`).

export const ENQUIRY_TYPES = ["GENERAL_INQUIRY", "CALLBACK_REQUEST", "COMPLAINT", "EMERGENCY", "SPECIAL_REQUEST"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];
export const TYPE_LABEL: Record<EnquiryType, string> = {
  GENERAL_INQUIRY: "General Inquiry",
  CALLBACK_REQUEST: "Callback Request",
  COMPLAINT: "Complaint",
  EMERGENCY: "Emergency",
  SPECIAL_REQUEST: "Special Request",
};

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "VISIT", "BOOKED"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export const STATUS_LABEL: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  VISIT: "Scheduled Visit",
  BOOKED: "Booked / Converted",
};
export const STATUS_TONE: Record<EnquiryStatus, "blue" | "amber" | "purple" | "green"> = {
  NEW: "blue",
  CONTACTED: "amber",
  VISIT: "purple",
  BOOKED: "green",
};

/** The registered manygym account an enquiry is linked to, when there is one. Read-only here. */
export type EnquiryUser = { id: string; name: string; email: string; phone: string; avatar: string };

export type Enquiry = {
  /** Empty until the server has created it. */
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: EnquiryType;
  status: EnquiryStatus;
  summary: string;
  /** Oldest first, as the API returns them. */
  notes: string[];
  user: EnquiryUser | null;
  gymName: string;
  createdAt: string;
  updatedAt: string;
};

export const ENQUIRIES_KEY = "enquiries";
export const NAME_MAX = 100;
export const PHONE_MAX = 50;

export const enquiryName = (e: Pick<Enquiry, "firstName" | "lastName">) => `${e.firstName} ${e.lastName}`.trim();

export const blankEnquiry = (): Enquiry => ({
  id: "", firstName: "", lastName: "", email: "", phone: "", type: "GENERAL_INQUIRY", status: "NEW",
  summary: "", notes: [], user: null, gymName: "", createdAt: "", updatedAt: "",
});

/** The API's own rules, checked before the request so the form can answer without a round trip. */
export function validateEnquiry(e: Enquiry): Record<string, string> {
  const out: Record<string, string> = {};
  const first = e.firstName.trim();
  const last = e.lastName.trim();
  const email = e.email.trim();
  const phone = e.phone.trim();
  if (!first) out.firstName = "First name is required";
  else if (first.length > NAME_MAX) out.firstName = `Use at most ${NAME_MAX} characters`;
  if (!last) out.lastName = "Last name is required";
  else if (last.length > NAME_MAX) out.lastName = `Use at most ${NAME_MAX} characters`;
  if (!email && !phone) out.contact = "Either an email or a phone number is required";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.email = "Enter a valid email address";
  if (phone.length > PHONE_MAX) out.phone = `Use at most ${PHONE_MAX} characters`;
  return out;
}
