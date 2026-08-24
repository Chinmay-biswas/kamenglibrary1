import { sendEmail, type EmailDelivery } from "./email-service";
import { addNotification, type NotificationRecord } from "./notification-service";
import { findAuthUserById } from "./user-service";

export type UserAlert = {
  notification?: NotificationRecord;
  email: EmailDelivery;
};

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// The app records an in-app alert first, then uses email as an optional second channel.
export async function alertUser(userId: string, title: string, body: string): Promise<UserAlert> {
  let notification: NotificationRecord | undefined;
  try {
    notification = await addNotification(userId, title, body);
  } catch (error) {
    console.error("Kameng Library in-app alert could not be saved.", error);
  }

  let email: EmailDelivery = { attempted: false, delivered: false, reason: "The seat holder has no email address." };
  try {
    const user = await findAuthUserById(userId);
    if (user?.email) {
      email = await sendEmail({
        to: user.email,
        subject: `Kameng Library: ${title}`,
        text: `${body}\n\nOpen your library dashboard: ${appUrl()}/dashboard\nOpen your notifications: ${appUrl()}/notifications`
      });
    }
  } catch (error) {
    console.error("Kameng Library email alert could not be prepared.", error);
    email = { attempted: false, delivered: false, reason: "The email recipient could not be loaded." };
  }

  return { notification, email };
}
