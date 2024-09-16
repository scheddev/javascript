import { format, parse } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";
import { html, render } from "lit-html";
import styles from "./styles.module.css";
import { bookAppointment, fetchAvailabilities } from "./api";
import { updateValidDays } from "./utils";

class BookingCalendarSDK {
  constructor() {
    this.container = null;
    this.selectedDate = format(new Date(), "yyyy-MM-dd"); // Default to today
    this.selectedSlot = null;
    this.slots = [];
    this.availabilities = [];
    this.showForm = false;
    this.formStatus = null;
    this.booking = null;
    this.accessToken = null;
    this.currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.apiUrl = "";
    this.demoMode = false;
  }

  async init(
    containerId,
    clientId,
    {
      resourceId,
      resourceGroupId,
      environment = "production",
      demoMode = false,
    }
  ) {
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
    this.setApiUrl(environment);
    this.resourceId = resourceId || null;
    this.resourceGroupId = resourceGroupId || null;
    this.demoMode = demoMode;

    await this.obtainAccessToken();
    await this.fetchAndSetAvailabilities();
    this.renderCalendar();
  }

  setApiUrl(environment) {
    switch (environment) {
      case "production":
        this.apiUrl = "https://api.sched.dev/v1";
        break;
      case "staging":
        this.apiUrl = "https://staging-api.sched.dev/v1";
        break;
      case "dev":
        this.apiUrl = "https://staging-api.sched.dev/v1";
        break;
      case "local":
        this.apiUrl = "http://localhost:8080/v1";
        break;
      default:
        throw new Error("Invalid environment specified");
    }
  }

  async obtainAccessToken() {
    if (this.demoMode) {
      this.accessToken = "demo-access-token";
      return;
    }

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
    if (this.demoMode) {
      this.availabilities = this.generateDemoAvailabilities(this.selectedDate);
      console.log("Availabilities in demo mode:", this.availabilities);
      return;
    }

    const start = new Date(this.selectedDate);
    const end = new Date(this.selectedDate);
    end.setDate(end.getDate() + 1);

    try {
      const availabilities = await fetchAvailabilities(
        this.apiUrl,
        this.accessToken,
        this.resourceId,
        this.resourceGroupId,
        start.toISOString(),
        end.toISOString()
      );

      this.availabilities = availabilities;
      console.log("Fetched availabilities:", this.availabilities);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
    }
  }

  generateDemoAvailabilities(selectedDate) {
    const date = new Date(selectedDate || new Date());
    const availabilities = [];

    const profilePics = [
      "https://sched.dev/user-pics/1.jpg", // Man
      "https://sched.dev/user-pics/2.jpg", // Man
      "https://sched.dev/user-pics/3.jpg", // Woman
      "https://sched.dev/user-pics/4.jpg", // Woman
    ];

    const names = [
      "John Doe",
      "Michael Smith",
      "Emily Johnson",
      "Sarah Williams",
    ];

    const descriptions = [
      "Expert in project management.",
      "Specialist in software development.",
      "Professional consultant.",
      "Experienced trainer and coach.",
    ];

    const startTimes = [9, 11, 13, 15]; // Sample times

    startTimes.forEach((hour, hourIndex) => {
      const start = new Date(date);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

      const resourceIdx = hourIndex % profilePics.length;

      availabilities.push({
        start: start.toISOString(),
        end: end.toISOString(),
        resource: {
          id: `demo-resource-${resourceIdx}`,
          name: names[resourceIdx],
          pic: profilePics[resourceIdx],
          description: descriptions[resourceIdx],
        },
      });
    });

    return availabilities;
  }

  renderCalendar() {
    render(
      html`
        <div class="${styles.calendarContainer}">
          ${this.demoMode
            ? html`
                <div class="${styles.demoBadgeContainer}">
                  <div class="${styles.demoBadge}">
                    Demo Mode – Don't worry, submitting this form will not
                    create a real booking.
                  </div>
                </div>
              `
            : ""}
          <div class="${styles.calendarScreen}">
            ${this.renderDateSlider()}
            <div class="${styles.slotsContainer}" id="slotsContainer">
              <!-- Include the slots template here -->
              ${this.renderSlotsTemplate()}
            </div>
          </div>
        </div>
      `,
      this.container
    );

    // Add the fadeIn class to the slotsContainer after rendering
    const slotsContainer = this.container.querySelector(
      `.${styles.slotsContainer}`
    );
    slotsContainer.classList.remove(styles.fadeIn);
    // Use a setTimeout to ensure the class is added after the element is rendered
    setTimeout(() => {
      slotsContainer.classList.add(styles.fadeIn);
    }, 100); // Longer delay before adding the class
  }

  renderSlotsTemplate() {
    const selectedDate = format(
      utcToZonedTime(new Date(this.selectedDate), this.currentTz),
      "yyyy-MM-dd"
    );

    const selectedSlots = this.availabilities
      .filter((availability) => {
        const availabilityDate = format(
          utcToZonedTime(new Date(availability.start), this.currentTz),
          "yyyy-MM-dd"
        );
        return availabilityDate === selectedDate;
      })
      .map((availability) => {
        const slotTime = format(
          utcToZonedTime(new Date(availability.start), this.currentTz),
          "h:mm a"
        );
        return {
          slot: slotTime,
          resource: availability.resource,
          originalStartTime: availability.start,
          originalEndTime: availability.end,
          compoundKey: `${selectedDate}-${format(
            utcToZonedTime(new Date(availability.start), this.currentTz),
            "HH:mm"
          )}-${availability.resource.id}`,
        };
      });

    this.slots = selectedSlots;

    return html`
      <ul class="${styles.slotsList}">
        ${this.slots.map(
          (slot, index) => html`
            <li key=${index} class="${styles.slotItem} ${styles.fadeIn}">
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
                  ${this.selectedSlot?.compoundKey !== slot.compoundKey
                    ? html`
                        <button
                          class="${styles.slotButton} ${this.selectedSlot
                            ?.compoundKey === slot.compoundKey
                            ? styles.selected
                            : ""}"
                          @click=${() => this.selectSlot(slot)}
                        >
                          ${slot.slot}
                        </button>
                      `
                    : html`
                        <button
                          class="${styles.nextButton}"
                          @click=${this.next.bind(this)}
                        >
                          <span>${slot.slot}</span>
                        </button>
                      `}
                </div>
              </div>
            </li>
          `
        )}
      </ul>
    `;
  }

  renderDateSlider() {
    const dates = this.getDateRangeForSlider();

    return html`
      <div class="${styles.dateSliderWrapper}">
        <!-- Selected Date Display -->
        <div class="${styles.selectedDateDisplay}">
          ${format(new Date(this.selectedDate), "EEEE, MMMM do, yyyy")}
        </div>
        <!-- Date Buttons with Arrows -->
        <div class="${styles.dateButtonsWithArrows}">
          <button
            class="${styles.dateSliderButton}"
            @click="${this.handlePreviousDate.bind(this)}"
            aria-label="Previous Dates"
          >
            &lt;
          </button>
          <div class="${styles.dateButtonsContainer}">
            ${dates.map(
              (date) => html`
                <button
                  class="${styles.dateButton} ${this.isSameDate(
                    date,
                    new Date(this.selectedDate)
                  )
                    ? styles.selectedDateButton
                    : ""}"
                  @click="${() => this.selectDate(date)}"
                  aria-label="${format(date, "MMMM d, yyyy")}"
                >
                  <div class="${styles.dateButtonDay}">
                    ${format(date, "E")}
                  </div>
                  <div class="${styles.dateButtonDate}">
                    ${format(date, "d")}
                  </div>
                </button>
              `
            )}
          </div>
          <button
            class="${styles.dateSliderButton}"
            @click="${this.handleNextDate.bind(this)}"
            aria-label="Next Dates"
          >
            &gt;
          </button>
        </div>
      </div>
    `;
  }

  getDateRangeForSlider() {
    const dates = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);

    // Minimum date is today minus 2 days
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 2);

    // Compute startDate as the maximum of (selectedDate - 2 days) and minDate
    let startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 2);
    if (startDate < minDate) {
      startDate = minDate;
    }

    // Generate 5 dates starting from startDate
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  isSameDate(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  selectDate(date) {
    this.selectedDate = format(date, "yyyy-MM-dd");
    this.fetchAndSetAvailabilities().then(() => {
      this.renderCalendar();
    });
  }

  handlePreviousDate() {
    const previousDate = new Date(this.selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    this.selectedDate = format(previousDate, "yyyy-MM-dd");

    this.fetchAndSetAvailabilities().then(() => {
      this.renderCalendar();
    });
  }

  handleNextDate() {
    const nextDate = new Date(this.selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    this.selectedDate = format(nextDate, "yyyy-MM-dd");

    this.fetchAndSetAvailabilities().then(() => {
      this.renderCalendar();
    });
  }

  selectSlot(slot) {
    this.selectedSlot = slot;
    this.renderCalendar(); // Re-render the calendar to reflect changes
  }

  next() {
    this.showForm = true;
    if (this.selectedSlot) {
      const bookingDetails = this.getBookingDetails();
      this.renderForm(bookingDetails);
    } else {
      console.error("No slot selected");
    }
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

  renderForm(bookingDetails) {
    renderBookingForm(
      this.container,
      this.handleSubmit.bind(this),
      this.formStatus,
      bookingDetails,
      this.demoMode
    );

    const formContainer = document.querySelector(
      `.${styles.bookingFormContainer}`
    );
    formContainer.classList.remove(styles.fadeIn);
    setTimeout(() => {
      formContainer.classList.add(styles.fadeIn);
    }, 50);
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
      start: this.selectedSlot.originalStartTime,
      end: this.selectedSlot.originalEndTime,
    };

    const resourceId = this.selectedSlot.resource.id;

    if (!resourceId) {
      this.formStatus = "error";
      this.renderErrorMessage("No resource ID found for the selected slot.");
      return;
    }

    if (this.demoMode) {
      this.booking = {
        start: this.selectedSlot.originalStartTime,
        end: this.selectedSlot.originalEndTime,
        resource: {
          id: resourceId,
          name: this.selectedSlot.resource.name,
          pic: this.selectedSlot.resource.pic,
          description: this.selectedSlot.resource.description,
        },
      };
      this.formStatus = "success";
      this.renderBookingConfirmation();
      return;
    }

    try {
      this.booking = await bookAppointment(
        this.accessToken,
        data,
        this.apiUrl,
        resourceId,
        this.demoMode
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
      renderBookingConfirmation(
        this.container,
        this.booking,
        this.currentTz,
        this.demoMode
      );
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

  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}

const renderBookingConfirmation = (
  container,
  booking,
  currentTz,
  isDemoMode
) => {
  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);

  const localStartDate = utcToZonedTime(startDate, currentTz);
  const localEndDate = utcToZonedTime(endDate, currentTz);

  render(
    html`
      <div
        class="${styles.bookingFormContainer} ${styles.fadeIn}"
        style="text-align: center;"
      >
        ${isDemoMode
          ? html`
              <div class="${styles.demoBadgeContainer}">
                <div class="${styles.demoBadge}">
                  Demo Mode – Don't worry, submitting this form will not create
                  a real booking.
                </div>
              </div>
            `
          : ""}
        <div
          class="${styles.confirmationHeader}"
          style="display: flex; align-items: center; justify-content: center;"
        >
          <svg
            class="${styles.checkmarkIcon}"
            viewBox="0 0 24 24"
            style="width: 48px; height: 48px; fill: #4CAF50; animation: checkmark 0.6s ease-in-out;"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            />
          </svg>
          <h2
            class="${styles.confirmationTitle}"
            style="margin-left: 16px; font-size: 24px; color: #333;"
          >
            Booking Confirmed!
          </h2>
        </div>
        <div
          class="${styles.confirmationBody}"
          style="margin-top: 20px; text-align: center;"
        >
          <img
            src="${booking.resource.pic}"
            alt="${booking.resource.name}"
            class="${styles.resourceImage}"
            style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto;"
          />
          <h3
            class="${styles.resourceName}"
            style="font-size: 20px; margin-top: 10px; color: #333;"
          >
            ${booking.resource.name}
          </h3>
          <p
            class="${styles.resourceDescription}"
            style="font-size: 16px; color: #777;"
          >
            ${booking.resource.description}
          </p>
          <div
            class="${styles.appointmentDetails}"
            style="margin-top: 20px; font-size: 16px; color: #333;"
          >
            <p class="${styles.appointmentDate}">
              <strong>Date:</strong> ${format(
                localStartDate,
                "EEEE, MMMM d, yyyy"
              )}
            </p>
            <p class="${styles.appointmentTime}">
              <strong>Time:</strong> ${format(localStartDate, "h:mm a")} -
              ${format(localEndDate, "h:mm a")}
            </p>
            <p class="${styles.appointmentTimezone}">
              <strong>Timezone:</strong> ${currentTz}
            </p>
          </div>
        </div>
        <div class="${styles.confirmationFooter}" style="margin-top: 30px;">
          <p
            class="${styles.confirmationEmail}"
            style="font-size: 14px; color: #666;"
          >
            A confirmation has been sent to your email address.
          </p>
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
  bookingDetails,
  isDemoMode
) => {
  render(
    html`
      <div class="${styles.bookingFormContainer}">
        ${isDemoMode
          ? html`
              <div class="${styles.demoBadgeContainer}">
                <div class="${styles.demoBadge}">
                  Demo Mode – Don't worry, submitting this form will not create
                  a real booking.
                </div>
              </div>
            `
          : ""}
        <!-- Move the booking summary above the form -->
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

        <!-- Update the form container -->
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
      </div>
    `,
    container
  );
};

export default BookingCalendarSDK;
