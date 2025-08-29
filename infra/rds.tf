resource "aws_db_subnet_group" "db" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = local.private_subnets
}

resource "aws_db_instance" "postgres" {
  storage_encrypted = true
  kms_key_id = aws_kms_key.app.arn
  identifier              = "${local.name_prefix}-pg"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.db.name
  db_name                 = var.db_name
  vpc_security_group_ids  = [aws_security_group.db.id]
  multi_az                = false
  publicly_accessible     = false
  skip_final_snapshot     = true
  deletion_protection     = false
}

output "db_endpoint" { value = aws_db_instance.postgres.address }
