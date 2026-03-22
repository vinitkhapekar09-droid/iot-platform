import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.config import settings


def send_alert_email(
    to_email: str,
    device_id: str,
    metric_name: str,
    condition: str,
    threshold_value: float,
    actual_value: float,
    project_name: str,
) -> bool:
    """Send alert email. Returns True if sent successfully."""

    if not settings.alert_email or not settings.alert_email_password:
        print("Email not configured — skipping email alert")
        return False

    # Build subject
    condition_text = "exceeded" if condition == "gt" else "dropped below"
    subject = f"⚠️ IoT Alert: {device_id} {metric_name} {condition_text} threshold"

    # Build HTML email body
    color = "#ef4444" if condition == "gt" else "#3b82f6"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #38bdf8; margin: 0;">⚡ IoT Platform Alert</h2>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
            
            <div style="background: {color}20; border-left: 4px solid {color}; 
                        padding: 16px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: {color}; margin: 0 0 8px 0;">
                    ⚠️ Threshold {condition_text.title()}
                </h3>
                <p style="margin: 0; color: #374151;">
                    {device_id} reported an abnormal {metric_name} reading.
                </p>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f1f5f9;">
                    <td style="padding: 12px; font-weight: bold; color: #374151;">
                        Project
                    </td>
                    <td style="padding: 12px; color: #374151;">
                        {project_name}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; color: #374151;">
                        Device
                    </td>
                    <td style="padding: 12px; color: #374151;">
                        {device_id}
                    </td>
                </tr>
                <tr style="background: #f1f5f9;">
                    <td style="padding: 12px; font-weight: bold; color: #374151;">
                        Metric
                    </td>
                    <td style="padding: 12px; color: #374151;">
                        {metric_name}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; color: #374151;">
                        Actual Value
                    </td>
                    <td style="padding: 12px; color: {color}; font-weight: bold;">
                        {actual_value}
                    </td>
                </tr>
                <tr style="background: #f1f5f9;">
                    <td style="padding: 12px; font-weight: bold; color: #374151;">
                        Threshold
                    </td>
                    <td style="padding: 12px; color: #374151;">
                        {condition_text} {threshold_value}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; color: #374151;">
                        Time
                    </td>
                    <td style="padding: 12px; color: #374151;">
                        {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")} UTC
                    </td>
                </tr>
            </table>

            <div style="margin-top: 24px; text-align: center;">
                <a href="https://aiot-platform.vercel.app"
                   style="background: #38bdf8; color: #0f172a; padding: 12px 24px;
                          border-radius: 6px; text-decoration: none; font-weight: bold;">
                    View Dashboard
                </a>
            </div>

            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;">
                This alert was sent by IoT Platform. 
                You can manage alert rules from your dashboard.
            </p>
        </div>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.alert_email
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(
                settings.alert_email,
                settings.alert_email_password
            )
            server.sendmail(
                settings.alert_email,
                to_email,
                msg.as_string()
            )

        print(f"✅ Alert email sent to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False


def send_offline_alert_email(
    to_email: str,
    device_id: str,
    project_name: str,
    last_seen_minutes: int,
) -> bool:
    """Send device offline alert email."""

    if not settings.alert_email or not settings.alert_email_password:
        return False

    subject = f"🔴 IoT Alert: {device_id} is OFFLINE"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        
        <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #38bdf8; margin: 0;">⚡ IoT Platform Alert</h2>
        </div>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
            
            <div style="background: #ef444420; border-left: 4px solid #ef4444;
                        padding: 16px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #ef4444; margin: 0 0 8px 0;">
                    🔴 Device Offline
                </h3>
                <p style="margin: 0; color: #374151;">
                    {device_id} has stopped sending data.
                </p>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f1f5f9;">
                    <td style="padding: 12px; font-weight: bold;">Project</td>
                    <td style="padding: 12px;">{project_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold;">Device</td>
                    <td style="padding: 12px;">{device_id}</td>
                </tr>
                <tr style="background: #f1f5f9;">
                    <td style="padding: 12px; font-weight: bold;">Offline For</td>
                    <td style="padding: 12px; color: #ef4444; font-weight: bold;">
                        {last_seen_minutes} minutes
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold;">Time</td>
                    <td style="padding: 12px;">
                        {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")} UTC
                    </td>
                </tr>
            </table>

            <div style="margin-top: 24px; text-align: center;">
                <a href="https://aiot-platform.vercel.app"
                   style="background: #38bdf8; color: #0f172a; padding: 12px 24px;
                          border-radius: 6px; text-decoration: none; font-weight: bold;">
                    View Dashboard
                </a>
            </div>
        </div>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.alert_email
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(
                settings.alert_email,
                settings.alert_email_password
            )
            server.sendmail(
                settings.alert_email,
                to_email,
                msg.as_string()
            )

        print(f"✅ Offline alert sent to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send offline alert: {e}")
        return False