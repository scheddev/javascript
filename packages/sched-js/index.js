import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, parse } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";
import { html, render } from "lit-html";
import styles from "./styles.module.css";
import { bookAppointment, fetchAvailabilities } from "./api";
import { updateValidDays } from "./utils";

class BookingCalendarSDK {
  constructor() {
    this.container = null;
    this.validDays = [];
    this.selectedDate = format(new Date(), "yyyy-MM-dd"); // Pre-select today's date
    this.selectedSlot = null;
    this.slots = [];
    this.availabilities = [];
    this.showForm = false;
    this.formStatus = null;
    this.booking = null;
    this.accessToken = null;
    this.currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  async init(containerId, clientId, apiUrl, { resourceId, resourceGroupId }) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id ${containerId} not found`);
    }

    if (resourceId && resourceGroupId) {
      throw new Error(
        "Both resourceId and resourceGroupId cannot be provided. Please pass only one."
      );
    }

    if (!resourceId && !resourceGroupId) {
      throw new Error("Either resourceId or resourceGroupId must be provided.");
    }

    this.clientId = clientId;
    this.apiUrl = apiUrl;
    this.resourceId = resourceId || null;
    this.resourceGroupId = resourceGroupId || null;

    await this.obtainAccessToken();
    await this.fetchAndSetAvailabilities();
    this.renderCalendar();
    this.renderSlots(true); // Render slots for today's date
  }

  async obtainAccessToken() {
    const response = await fetch(`${this.apiUrl}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: "client_id_grant",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to obtain access token");
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async fetchAndSetAvailabilities() {
    const start = new Date().toISOString();
    const end = new Date(
      new Date().setMonth(new Date().getMonth() + 1)
    ).toISOString();

    try {
      const availabilities = await fetchAvailabilities(
        this.apiUrl,
        this.accessToken,
        this.resourceId,
        this.resourceGroupId,
        start,
        end
      );

      this.availabilities = availabilities;
      this.validDays = updateValidDays(this.availabilities);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
    }
  }

  handleDateClick(event) {
    const date = event.dateStr;
    if (this.validDays.includes(date)) {
      this.selectedDate = date;
      this.fetchAndSetAvailabilities().then(() => {
        this.renderSlots(true); // Pass true to indicate date change
        this.renderCalendar();
      });
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    let data = Object.fromEntries(formData);

    if (!this.selectedSlot) {
      this.formStatus = "error";
      this.renderErrorMessage("No slot selected for booking.");
      return;
    }

    const slotTime24 = format(
      parse(this.selectedSlot.slot, "h:mm a", new Date()),
      "HH:mm"
    );
    const startTime = new Date(`${this.selectedDate}T${slotTime24}`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    data = {
      ...data,
      start: startTime,
      end: endTime,
    };

    const resourceId = this.selectedSlot.resource.id;

    if (!resourceId) {
      this.formStatus = "error";
      this.renderErrorMessage("No resource ID found for the selected slot.");
      return;
    }

    try {
      this.booking = await bookAppointment(
        this.accessToken,
        data,
        this.apiUrl,
        resourceId
      );
      this.formStatus = "success";
      this.renderBookingConfirmation();
    } catch (error) {
      this.formStatus = "error";
      console.error("Error booking appointment:", error);
      this.renderErrorMessage(
        error.message ||
          "There was an error in booking. Please try again later."
      );
    }
  }

  renderBookingConfirmation() {
    if (this.booking) {
      renderBookingConfirmation(this.container, this.booking, this.currentTz);
    } else {
      console.error("Booking confirmation called without a valid booking");
    }
  }

  renderErrorMessage() {
    const errorMessage =
      "There was an error in booking. Please try again later.";
    render(
      html`<div class="${styles.errorMessage}">${errorMessage}</div>`,
      this.container
    );
  }

  renderForm() {
    const bookingDetails = this.getBookingDetails();
    renderBookingForm(
      this.container,
      this.handleSubmit.bind(this),
      this.formStatus,
      bookingDetails
    );

    // Apply fade-in effect to the form
    const formContainer = document.querySelector(
      `.${styles.bookingFormContainer}`
    );
    formContainer.classList.remove(styles.fadeIn); // Reset animation
    setTimeout(() => {
      formContainer.classList.add(styles.fadeIn);
    }, 50); // Delay to allow the DOM to update
  }

  getBookingDetails() {
    if (!this.selectedSlot || !this.selectedDate) {
      return null;
    }
    return {
      date: format(new Date(this.selectedDate), "MMMM d, yyyy"),
      time: this.selectedSlot.slot,
      duration: "1 hour", // Assuming 1-hour duration, adjust if needed
      resourceName: this.selectedSlot.resource.name,
      resourcePic: this.selectedSlot.resource.pic,
      resourceDescription: this.selectedSlot.resource.description,
      serviceName: "Consultation", // Adjust this based on your actual service name
    };
  }

  renderCalendar() {
    renderCalendarLayout(this.container, this.selectedDate);
    initializeCalendar(
      this.handleDateClick.bind(this),
      this.availabilities,
      this.selectedDate
    );
  }

  renderSlots(isDateChange = false) {
    const selectedSlots = this.availabilities
      .filter(
        (availability) =>
          format(
            utcToZonedTime(new Date(availability.start), this.currentTz),
            "yyyy-MM-dd"
          ) === this.selectedDate
      )
      .map((availability) => ({
        slot: format(
          utcToZonedTime(new Date(availability.start), this.currentTz),
          "h:mm a"
        ),
        resource: availability.resource,
        compoundKey: `${this.selectedDate}-${format(
          utcToZonedTime(new Date(availability.start), this.currentTz),
          "HH:mm"
        )}-${availability.resource.id}`,
      }));

    this.slots = selectedSlots;
    const slotsContainer = document.getElementById("slotsContainer");
    renderSlots(
      slotsContainer,
      this.slots,
      this.selectedSlot,
      this.selectSlot.bind(this),
      this.next.bind(this)
    );

    // Only trigger fade-in effect if slots are being rendered due to a date change
    if (isDateChange) {
      setTimeout(() => {
        const slotItems = slotsContainer.querySelectorAll(
          `.${styles.slotItem}`
        );
        slotItems.forEach((item, index) => {
          item.classList.remove(styles.fadeIn); // Reset animation
          setTimeout(() => {
            item.classList.add(styles.fadeIn);
          }, index * 50); // Stagger the fade-in effect
        });
      }, 50); // Delay to allow the DOM to update
    }
  }

  selectSlot(slot) {
    this.selectedSlot = slot;
    this.renderSlots(); // No animation triggered here
  }

  next() {
    this.showForm = true;
    if (this.selectedSlot) {
      const bookingDetails = {
        date: format(new Date(this.selectedDate), "MMMM d, yyyy"),
        time: this.selectedSlot.slot,
        duration: "1 hour", // Assuming 1-hour duration, adjust if needed
        resourceName: this.selectedSlot.resource.name,
        resourcePic: this.selectedSlot.resource.pic,
        resourceDescription: this.selectedSlot.resource.description,
        serviceName: "Consultation", // Adjust this based on your actual service name
      };
      this.renderForm(bookingDetails);
    } else {
      console.error("No slot selected");
    }
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}

const renderCalendarLayout = (container, selectedDate) => {
  const formattedDate = selectedDate
    ? format(new Date(selectedDate), "EEEE, MMMM do")
    : "Select a Date";

  render(
    html`
      <div class="${styles.twoColumnLayout}">
        <div class="${styles.slotsContainer}" id="slotsContainer">
          <h3>Available Slots on ${formattedDate}</h3>
        </div>
        <div class="${styles.calendar}" id="calendar"></div>
      </div>
    `,
    container
  );
};

const initializeCalendar = (handleDateClick, availabilities, selectedDate) => {
  const calendarEl = document.getElementById("calendar");
  const calendar = new Calendar(calendarEl, {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: "dayGridMonth",
    initialDate: selectedDate, // Set initial date to the selected date (today)
    dateClick: handleDateClick,
    events: generateUniqueEvents(availabilities),
    validRange: { start: new Date() },
    headerToolbar: {
      start: "prev",
      center: "title",
      end: "next",
    },
    height: "auto",
    dayHeaderFormat: { weekday: "narrow" },
  });
  calendar.render();

  // Programmatically trigger a date click for today's date
  const todayCell = calendarEl.querySelector(".fc-day-today");
  if (todayCell) {
    const clickEvent = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    todayCell.dispatchEvent(clickEvent);
  }
};

const generateUniqueEvents = (availabilities) => {
  const uniqueEvents = availabilities.reduce((events, availability) => {
    const dateStr = format(
      zonedTimeToUtc(availability.start, "UTC"),
      "yyyy-MM-dd"
    );
    if (!events[dateStr]) {
      events[dateStr] = {
        title: "Available",
        start: availability.start,
        allDay: true,
      };
    }
    return events;
  }, {});

  return Object.values(uniqueEvents);
};

// Form-related functions
const renderBookingConfirmation = (container, booking, currentTz) => {
  const startDate = new Date(booking.start + "Z");
  const endDate = new Date(booking.end + "Z");

  render(
    html`
      <div class="${styles.bookingFormContainer}">
        <div class="${styles.twoColumnLayout}">
          <div class="${styles.bookingConfirmation}">
            <h3 class="${styles.formTitle}">Booking Confirmed</h3>
            <div class="${styles.confirmationDetails}">
              <p class="${styles.confirmationSubtitle}">
                You are scheduled with ${booking.resource.name}.
              </p>
              <div class="${styles.meetingDetails}">
                <p class="${styles.meetingTime}">
                  <strong>Date and Time:</strong> ${format(
                    utcToZonedTime(startDate, currentTz),
                    "p, EEEE, MMMM d, yyyy"
                  )}
                  - ${format(utcToZonedTime(endDate, currentTz), "p")}
                </p>
              </div>
              <p class="${styles.confirmationEmail}">
                A confirmation has been sent to your email address.
              </p>
            </div>
          </div>
          <div class="${styles.bookingSummary}">
            <div class="${styles.summaryHeader}">
              <img
                src="${booking.resource.pic}"
                class="${styles.summaryPic}"
                alt="Resource Icon"
              />
              <div class="${styles.summaryDetails}">
                <p class="${styles.summaryResource}">
                  ${booking.resource.name}
                </p>
                <p class="${styles.summaryDescription}">
                  ${booking.resource.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    container
  );
};

const renderBookingForm = (
  container,
  handleSubmit,
  formStatus,
  bookingDetails
) => {
  render(
    html`
      <div class="${styles.bookingFormContainer}">
        <div class="${styles.twoColumnLayout}">
          <div class="${styles.bookingForm}">
            <h3 class="${styles.formTitle}">Enter Details</h3>
            <form id="bookingForm" @submit=${handleSubmit}>
              <fieldset class="${styles.formFieldset}">
                <div class="${styles.formRow}">
                  <div class="${styles.formGroup}">
                    <label for="firstName" class="${styles.formLabel}">
                      <span class="${styles.labelText}">First Name *</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      class="${styles.formInput}"
                      required
                    />
                  </div>
                  <div class="${styles.formGroup}">
                    <label for="lastName" class="${styles.formLabel}">
                      <span class="${styles.labelText}">Last Name *</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      class="${styles.formInput}"
                      required
                    />
                  </div>
                </div>
                <div class="${styles.formGroup}">
                  <label for="email" class="${styles.formLabel}">
                    <span class="${styles.labelText}">Email *</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    class="${styles.formInput}"
                    required
                  />
                </div>
              </fieldset>
              <button type="submit" class="${styles.submitButton}">
                Schedule Event
              </button>
              ${formStatus === "error"
                ? html`<div class="${styles.errorMessage}">
                    There was an error in booking. Please try again later.
                  </div>`
                : ""}
            </form>
          </div>
          <div class="${styles.bookingSummary}">
            <div class="${styles.summaryHeader}">
              <img
                src="${bookingDetails.resourcePic}"
                class="${styles.summaryPic}"
                alt="Resource Icon"
              />
              <div class="${styles.summaryDetails}">
                <p class="${styles.summaryResource}">
                  ${bookingDetails.resourceName}
                </p>
                <p class="${styles.summaryDescription}">
                  <strong>${bookingDetails.time}</strong> on
                  <strong>${bookingDetails.date}</strong> for
                  <strong>${bookingDetails.duration}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    container
  );
};

const renderSlots = (container, slots, selectedSlot, selectSlot, next) => {
  render(
    html`
      <ul class="${styles.slotsList}">
        ${slots.map(
          (slot, index) => html`
            <li key=${index} class="${styles.slotItem}">
              <div class="${styles.slotResource}">
                <div class="${styles.slotResourceInfo}">
                  <img
                    src="${slot.resource.pic}"
                    class="${styles.slotResourcePic}"
                    alt="Calendar Icon"
                  />
                  <div class="${styles.slotResourceDetails}">
                    <p class="${styles.slotResourceName}">
                      ${slot.resource.name}
                    </p>
                    <p class="${styles.slotResourceDescription}">
                      ${slot.resource.description}
                    </p>
                  </div>
                </div>
                <div>
                  ${selectedSlot?.compoundKey !== slot.compoundKey
                    ? html`
                        <button
                          class="${styles.slotButton} ${selectedSlot?.compoundKey ===
                          slot.compoundKey
                            ? styles.selected
                            : ""}"
                          @click=${() => selectSlot(slot)}
                        >
                          ${slot.slot}
                        </button>
                      `
                    : ""}
                  ${selectedSlot?.compoundKey === slot.compoundKey
                    ? html`<button class="${styles.nextButton}" @click=${next}>
                        <span>${slot.slot}</span>
                      </button>`
                    : ""}
                </div>
              </div>
            </li>
          `
        )}
      </ul>
    `,
    container
  );
};

export default BookingCalendarSDK;
