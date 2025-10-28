import * as React from "react";

type BookingConfirmationEmailProps = {
  customerName: string;
  bookingId: string | number;
  servicePackage: string;
  appointmentDate: string;
  appointmentTime: string;
  addOns?: string[]; // optional list of add-on names
};

export function BookingConfirmationEmail({
  customerName,
  bookingId,
  servicePackage,
  appointmentDate,
  appointmentTime,
  addOns,
}: BookingConfirmationEmailProps) {
  const formattedDate = new Date(appointmentDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format time to 12-hour
  const [hourStr, minuteStr] = appointmentTime.split(":");
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const formattedTime = `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        lineHeight: "1.6",
        color: "#333333",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#1a365d",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            fontSize: "28px",
            fontWeight: "bold",
            margin: "0 0 8px 0",
          }}
        >
          The Launch Pad
        </h1>
        <p style={{ color: "#a0aec0", fontSize: "16px", margin: "0" }}>
          Booking Confirmation
        </p>
      </div>

      {/* Success Message */}
      <div
        style={{
          backgroundColor: "#f0fff4",
          border: "1px solid #9ae6b4",
          borderRadius: "8px",
          padding: "20px",
          margin: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              backgroundColor: "#38a169",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
              fontSize: "14px", // slightly smaller if needed
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            <span
              style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}
            >
              ✓
            </span>
          </div>
          <h2
            style={{
              color: "#2d3748",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "0",
            }}
          >
            Booking Confirmed!
          </h2>
        </div>
        <p style={{ color: "#4a5568", fontSize: "16px", margin: "0" }}>
          Hi {customerName}, your appointment has been successfully booked.
          We're looking forward to seeing you!
        </p>
      </div>

      {/* Booking Details */}
      <div style={{ margin: "24px" }}>
        <h3
          style={{
            color: "#2d3748",
            fontSize: "18px",
            fontWeight: "bold",
            marginBottom: "16px",
            borderBottom: "2px solid #e2e8f0",
            paddingBottom: "8px",
          }}
        >
          Booking Details
        </h3>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #e2e8f0",
                  width: "40%",
                }}
              >
                <strong style={{ color: "#4a5568", fontSize: "14px" }}>
                  Booking ID:
                </strong>
              </td>
              <td
                style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}
              >
                <span
                  style={{
                    color: "#2d3748",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    backgroundColor: "#f7fafc",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  #{bookingId}
                </span>
              </td>
            </tr>
            <tr>
              <td
                style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}
              >
                <strong style={{ color: "#4a5568", fontSize: "14px" }}>
                  Service:
                </strong>
              </td>
              <td
                style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}
              >
                <span style={{ color: "#2d3748", fontSize: "14px" }}>
                  {servicePackage}
                </span>
              </td>
            </tr>
            {addOns && addOns.length > 0 && (
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <strong style={{ color: "#4a5568", fontSize: "14px" }}>
                    Add-Ons:
                  </strong>
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ color: "#2d3748", fontSize: "14px" }}>
                    {addOns.join(", ")}
                  </span>
                </td>
              </tr>
            )}
            <tr>
              <td
                style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}
              >
                <strong style={{ color: "#4a5568", fontSize: "14px" }}>
                  Date:
                </strong>
              </td>
              <td
                style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}
              >
                <span
                  style={{
                    color: "#2d3748",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {formattedDate}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0" }}>
                <strong style={{ color: "#4a5568", fontSize: "14px" }}>
                  Time:
                </strong>
              </td>
              <td style={{ padding: "12px 0" }}>
                <span
                  style={{
                    color: "#2d3748",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {formattedTime}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Important Information */}
      <div
        style={{
          backgroundColor: "#fffaf0",
          border: "1px solid #fbd38d",
          borderRadius: "8px",
          padding: "20px",
          margin: "24px",
        }}
      >
        <h4
          style={{
            color: "#c05621",
            fontSize: "16px",
            fontWeight: "bold",
            margin: "0 0 12px 0",
          }}
        >
          Important Information
        </h4>
        <ul
          style={{
            color: "#744210",
            fontSize: "14px",
            margin: "0",
            paddingLeft: "20px",
          }}
        >
          <li style={{ marginBottom: "8px" }}>
            Please arrive 10 minutes before your scheduled appointment
          </li>
          <li style={{ marginBottom: "8px" }}>
            Bring a valid ID and any relevant documents
          </li>
          <li style={{ marginBottom: "8px" }}>
            If you need to reschedule, please contact us at least 24 hours in
            advance
          </li>
        </ul>
      </div>

      {/* Contact Information */}
      {/* {(businessAddress || businessPhone || businessEmail) && (
        <div style={{ margin: "24px" }}>
          <h3
            style={{
              color: "#2d3748",
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "16px",
              borderBottom: "2px solid #e2e8f0",
              paddingBottom: "8px",
            }}
          >
            Contact Information
          </h3>
          <div
            style={{
              backgroundColor: "#f7fafc",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            {businessAddress && (
              <p
                style={{
                  color: "#4a5568",
                  fontSize: "14px",
                  margin: "0 0 8px 0",
                }}
              >
                <strong>Address:</strong> {businessAddress}
              </p>
            )}
            {businessPhone && (
              <p
                style={{
                  color: "#4a5568",
                  fontSize: "14px",
                  margin: "0 0 8px 0",
                }}
              >
                <strong>Phone:</strong>{" "}
                <a
                  href={`tel:${businessPhone}`}
                  style={{ color: "#3182ce", textDecoration: "none" }}
                >
                  {businessPhone}
                </a>
              </p>
            )}
            {businessEmail && (
              <p style={{ color: "#4a5568", fontSize: "14px", margin: "0" }}>
                <strong>Email:</strong>{" "}
                <a
                  href={`mailto:${businessEmail}`}
                  style={{ color: "#3182ce", textDecoration: "none" }}
                >
                  {businessEmail}
                </a>
              </p>
            )}
          </div>
        </div>
      )} */}

      {/* Footer */}
      <div
        style={{
          backgroundColor: "#f7fafc",
          padding: "24px",
          textAlign: "center",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <p style={{ color: "#718096", fontSize: "14px", margin: "0 0 8px 0" }}>
          Thank you for choosing The Launch Pad
        </p>
        <p style={{ color: "#a0aec0", fontSize: "12px", margin: "0" }}>
          This is an automated confirmation email. Please do not reply to this
          message.
        </p>
      </div>
    </div>
  );
}
