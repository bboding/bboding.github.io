resource "kubernetes_cron_job" "ncnc_scripts" {
  metadata {
    name = var.name
  }
  spec {
    concurrency_policy            = "Forbid"
    schedule                      = var.crontime
    successful_jobs_history_limit = 1
    failed_jobs_history_limit = 1

    job_template {
      metadata {}
      spec {
        template {
          metadata {}
          spec {
            container {
              name  = var.name
              image = "doublencinc/ncnc-jobs:${var.app_version}"
              args = [
                var.program
              ]
              resources {
                requests {
                  memory = "50Mi"
                }
                limits {
                  memory = "400Mi"
                }
              }
              env_from {
                config_map_ref {
                  name = "ncnc-scripts"
                }
              }
              env_from {
                secret_ref {
                  name = "ncnc-scripts"
                }
              }
              volume_mount {
                name       = "key"
                mount_path = "/key"
                read_only  = true
              }
            }
            volume {
              name = "key"
              secret {
                secret_name = "ncnc-scripts-file"
              }
            }
            restart_policy = "OnFailure"
            image_pull_secrets {
              name = "regcred"
            }
          }
        }
      }
    }
  }
}