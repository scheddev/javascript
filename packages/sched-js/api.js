import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

export const apiCall = async (url, method, accessToken, body = null) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const bookAppointment = async (
  accessToken,
  data,
  apiUrl,
  resourceId
) => {
  if (!resourceId) {
    throw new Error("ResourceId must be provided.");
  }

  const bookingUrl = `${apiUrl}/bookings`;

  const formatDateToUTC = (date) => {
    const zonedTime = utcToZonedTime(date, "UTC");
    return format(zonedTime, "yyyy-MM-dd'T'HH:mm:ss");
  };

  const formattedStartTime = formatDateToUTC(data.start);
  const formattedEndTime = formatDateToUTC(data.end);

  const body = {
    start: formattedStartTime,
    end: formattedEndTime,
    status: "requested",
    resource_id: resourceId,
  };

  return await apiCall(bookingUrl, "POST", accessToken, body);
};

export const fetchAvailabilities = async (
  apiUrl,
  accessToken,
  resourceId,
  resourceGroupId,
  start,
  end
) => {
  if (resourceId && resourceGroupId) {
    throw new Error(
      "Both resourceId and resourceGroupId cannot be provided. Please pass only one."
    );
  }

  if (!resourceId && !resourceGroupId) {
    throw new Error("Either resourceId or resourceGroupId must be provided.");
  }

  let availabilitiesUrl = `${apiUrl}/availabilities?start=${start}&end=${end}&duration=60`;

  if (resourceId) {
    availabilitiesUrl += `&resource_id=${resourceId}`;
  } else if (resourceGroupId) {
    availabilitiesUrl += `&resource_group_id=${resourceGroupId}`;
  }

  const response = await apiCall(availabilitiesUrl, "GET", accessToken);
  return response?.data || [];
};
