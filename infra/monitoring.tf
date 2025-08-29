# Monitoring: example CloudWatch alarms (tune thresholds & dimensions)
variable "pager_sns_arn" { type = string }
variable "alb_name" { type = string }
variable "target_group_name" { type = string }

resource "aws_cloudwatch_metric_alarm" "alb_p95_latency" {
  alarm_name          = "alb-p95-latency-gt-1s"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 1
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "p95"
  dimensions = { LoadBalancer = var.alb_name }
  alarm_actions = [var.pager_sns_arn]
}

resource "aws_cloudwatch_metric_alarm" "ecs_5xx" {
  alarm_name          = "ecs-5xx-gt-5-per-min"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  dimensions = { TargetGroup = var.target_group_name }
  alarm_actions = [var.pager_sns_arn]
}

resource "aws_cloudwatch_metric_alarm" "booking_drop" {
  alarm_name          = "bookings-created-drop"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  threshold           = 1
  metric_name         = "bookings_created"
  namespace           = "Agentic/Voice"
  period              = 300
  statistic           = "Sum"
  alarm_actions       = [var.pager_sns_arn]
}
