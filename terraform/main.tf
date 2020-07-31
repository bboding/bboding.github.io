locals {
  docker_secret = "regcred"
  app_name      = "ncnc-scripts"
}

terraform {
  backend "s3" {
    bucket         = "ncnc-tf-state"
    key            = "ncnc-scripts.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "TfStates"
  }
}

resource "kubernetes_config_map" "ncnc_scripts" {
  metadata {
    name = local.app_name
  }

  data = {
    API_URL                    = "https://api2.ncnc.app/cms"
    API_USERNAME               = "monstercrab"
    GOOGLE_DRIVE_ACCESS_TOKEN  = "/key/google-drive-access-token.json"
    GOOGLE_DRIVE_REFRESH_TOKEN = "/key/google-drive-refresh-token.json"
    RDS_USER                   = "ncncapi"
  }
}

## 유의! UTC 타임 기준임
## 자정 (KST 24시 = UTC 15시)
module "gifa" {
  source = "./modules/cron-job"

  name     = "gifa"
  crontime = "44 23 * * *"
  program  = "gifa"

  app_version = var.app_version
}

module "gifa_buy_sell_count" {
  source = "./modules/cron-job"

  name     = "gifa-buy-sell-count"
  crontime = "3 0 * * *"
  program  = "gifa-buy-sell-count"

  app_version = var.app_version
}