# If vpc_id/subnets are not provided, try to use default VPC/subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [coalesce(var.vpc_id, data.aws_vpc.default.id)]
  }
}

locals {
  vpc_id            = coalesce(var.vpc_id, data.aws_vpc.default.id)
  public_subnets    = length(var.public_subnet_ids) > 0 ? var.public_subnet_ids : data.aws_subnets.default.ids
  private_subnets   = length(var.private_subnet_ids) > 0 ? var.private_subnet_ids : data.aws_subnets.default.ids
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB SG"
  vpc_id      = local.vpc_id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "ECS service SG"
  vpc_id      = local.vpc_id
  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db-sg"
  description = "RDS SG"
  vpc_id      = local.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "app_security_group_id" { value = aws_security_group.app.id }
output "private_subnet_ids" { value = local.private_subnets }
