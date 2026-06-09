class PruneExpiredSessionsWorker < BaseWorker
  STATEMENT_TIMEOUT = ENV.fetch('AT_LICENSE_PRUNE_STATEMENT_TIMEOUT') { '1min' }
  BATCH_SIZE        = ENV.fetch('AT_LICENSE_PRUNE_BATCH_SIZE')        { 1_000 }.to_i
  BATCH_WAIT        = ENV.fetch('AT_LICENSE_PRUNE_BATCH_WAIT')        { 1 }.to_f

  sidekiq_options queue: :cron,
                  cronitor_enabled: true

  def perform
    sessions = Session.where(<<~SQL.squish, max_age: 90.days.ago)
                        (created_at < :max_age AND last_used_at IS NULL) OR last_used_at < :max_age OR expiry < :max_age
                      SQL
                      .reorder(created_at: :asc)

    total = sessions.count
    sum   = 0

    batches = (total / BATCH_SIZE) + 1
    batch   = 0

    AtLicense.logger.info "[workers.prune-expired-sessions] Starting"
    AtLicense.logger.info "[workers.prune-expired-sessions] Pruning #{total} rows: batches=#{batches}"

    loop do
      count = sessions.statement_timeout(STATEMENT_TIMEOUT) do
        sessions.limit(BATCH_SIZE).delete_all
      end

      sum   += count
      batch += 1

      AtLicense.logger.info "[workers.prune-expired-sessions] Pruned #{sum}/#{total} rows: batch=#{batch}/#{batches}"

      sleep BATCH_WAIT

      break if count < BATCH_SIZE
    end

    AtLicense.logger.info "[workers.prune-expired-sessions] Done"
  end
end
