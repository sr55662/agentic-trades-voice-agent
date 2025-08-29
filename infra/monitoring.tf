variable "alarm_topic_arn" { type = string }

resource "aws_cloudwatch_metric_alarm" "api_5xx_high" {
  alarm_name          = "agentic-api-5xx-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  statistic           = "Sum"
  period              = 300
  alarm_description   = "ALB 5xx spikes"
  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
  alarm_actions = [var.alarm_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "bookings_drop" {
  alarm_name          = "agentic-bookings-drop"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  threshold           = 1
  metric_name         = "bookings_created"
  namespace           = "Agentic/Voice"
  statistic           = "Sum"
  period              = 3600
  alarm_description   = "Bookings created < 1 in the last hour"
  alarm_actions       = [var.alarm_topic_arn]
}
