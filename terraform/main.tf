locals {
  docker_secret = "regcred"
  app_version   = "1.1.0"
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
    API_USERNAME               = "demoaccount"
    GOOGLE_DRIVE_ACCESS_TOKEN  = "/key/google-drive-access-token.json"
    GOOGLE_DRIVE_REFRESH_TOKEN = "/key/google-drive-refresh-token.json"
  }
}

## 유의! UTC 타임 기준임
## 자정 (KST 24시 = UTC 15시)
module "gifa" {
  source = "./modules/cron-job"

  name     = "gifa"
  crontime = "44 23 * * *"
  program  = "gifa"

  app_version = local.app_version
}

module "gifa_buy_sell_count" {
  source = "./modules/cron-job"

  name     = "gifa"
  crontime = "3 0 * * *"
  program  = "gifa-buy-sell-count"

  app_version = local.app_version
}