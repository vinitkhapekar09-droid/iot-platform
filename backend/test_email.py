from app.services.email_service import send_alert_email

result = send_alert_email(
    to_email="vinitkhapekar09@gmail.com",
    device_id="esp32-bedroom",
    metric_name="temperature",
    condition="gt",
    threshold_value=30.0,
    actual_value=35.5,
    project_name="Test Project",
)

print("Email sent!" if result else "Email failed!")