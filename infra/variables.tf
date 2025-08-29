variable "aws_region" {
  type        = string
  description = "AWS region (e.g., us-east-1)"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for resource names (e.g., agentic)"
}

variable "github_repo" {
  type        = string
  description = "GitHub org/repo (e.g., yourorg/agentic-trades-voice-agent)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID to deploy into (optional if using default)"
  default     = null
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnets for ALB"
  default     = []
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for ECS and RDS"
  default     = []
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM cert ARN for HTTPS listener (optional)"
  default     = null
}

variable "db_username" {
  type        = string
  default     = "agentic"
}

variable "db_password" {
  type        = string
  sensitive   = true
}

variable "db_name" {
  type        = string
  default     = "agentic"
}

variable "container_port" {
  type        = number
  default     = 5050
}
