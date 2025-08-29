resource "aws_ecr_repository" "repo" {
  name                 = "${local.name_prefix}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

output "ecr_repo_name" { value = aws_ecr_repository.repo.name }
output "ecr_repo_url"  { value = aws_ecr_repository.repo.repository_url }
