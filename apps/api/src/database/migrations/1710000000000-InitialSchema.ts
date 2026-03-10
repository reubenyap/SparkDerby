import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum types
    await queryRunner.query(`CREATE TYPE race_status AS ENUM ('scheduled', 'active', 'settling', 'settled', 'cancelled')`);
    await queryRunner.query(`CREATE TYPE race_slot AS ENUM ('A', 'B')`);
    await queryRunner.query(`CREATE TYPE archetype AS ENUM ('balanced', 'sprinter', 'closer', 'tank', 'wildcard', 'technician')`);
    await queryRunner.query(`CREATE TYPE intent_type AS ENUM ('back', 'boost', 'emp', 'oil_slick', 'overclock', 'black_swan')`);
    await queryRunner.query(`CREATE TYPE action_type AS ENUM ('boost', 'emp', 'oil_slick', 'overclock', 'black_swan')`);
    await queryRunner.query(`CREATE TYPE action_status AS ENUM ('pending', 'applied', 'rejected', 'expired')`);
    await queryRunner.query(`CREATE TYPE event_status AS ENUM ('detected', 'instant_locked', 'confirmed', 'failed')`);
    await queryRunner.query(`CREATE TYPE event_purpose AS ENUM ('backing', 'action', 'payout', 'treasury', 'reserve')`);
    await queryRunner.query(`CREATE TYPE settlement_status AS ENUM ('pending', 'calculating', 'paying_out', 'completed', 'failed')`);

    // Players
    await queryRunner.query(`
      CREATE TABLE players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spark_address VARCHAR(160) NOT NULL UNIQUE,
        spark_name VARCHAR(64),
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        total_races INTEGER NOT NULL DEFAULT 0,
        total_backed NUMERIC(18,8) NOT NULL DEFAULT 0,
        total_won NUMERIC(18,8) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_players_spark_address ON players (spark_address)`);
    await queryRunner.query(`CREATE INDEX idx_players_spark_name ON players (spark_name) WHERE spark_name IS NOT NULL`);

    // Browser sessions
    await queryRunner.query(`
      CREATE TABLE browser_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES players(id),
        session_token VARCHAR(128) NOT NULL UNIQUE,
        user_agent TEXT,
        ip_address INET,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_sessions_token ON browser_sessions (session_token)`);
    await queryRunner.query(`CREATE INDEX idx_sessions_player ON browser_sessions (player_id)`);

    // Races
    await queryRunner.query(`
      CREATE TABLE races (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_date DATE NOT NULL,
        slot race_slot NOT NULL,
        status race_status NOT NULL DEFAULT 'scheduled',
        current_tick INTEGER NOT NULL DEFAULT 0,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        randomness_commit VARCHAR(64),
        randomness_reveal VARCHAR(64),
        total_prize_pool NUMERIC(18,8) NOT NULL DEFAULT 0,
        total_action_pool NUMERIC(18,8) NOT NULL DEFAULT 0,
        total_treasury NUMERIC(18,8) NOT NULL DEFAULT 0,
        total_reserve NUMERIC(18,8) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(race_date, slot)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_races_status ON races (status)`);
    await queryRunner.query(`CREATE INDEX idx_races_starts_at ON races (starts_at)`);

    // Racers
    await queryRunner.query(`
      CREATE TABLE racers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID NOT NULL REFERENCES races(id),
        lane SMALLINT NOT NULL CHECK (lane BETWEEN 1 AND 6),
        name VARCHAR(64) NOT NULL,
        archetype archetype NOT NULL,
        position NUMERIC(8,4) NOT NULL DEFAULT 0,
        speed NUMERIC(6,4) NOT NULL DEFAULT 0,
        base_speed NUMERIC(6,4) NOT NULL,
        stamina NUMERIC(6,4) NOT NULL DEFAULT 100,
        luck_modifier NUMERIC(6,4) NOT NULL DEFAULT 0,
        status_effects JSONB NOT NULL DEFAULT '[]',
        finish_position SMALLINT,
        finish_tick SMALLINT,
        total_backed NUMERIC(18,8) NOT NULL DEFAULT 0,
        backer_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(race_id, lane),
        UNIQUE(race_id, archetype)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_racers_race ON racers (race_id)`);

    // Race addresses
    await queryRunner.query(`
      CREATE TABLE race_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID NOT NULL REFERENCES races(id),
        racer_id UUID NOT NULL REFERENCES racers(id),
        intent intent_type NOT NULL,
        spark_address VARCHAR(160) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(race_id, racer_id, intent)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_race_addresses_spark ON race_addresses (spark_address)`);
    await queryRunner.query(`CREATE INDEX idx_race_addresses_race ON race_addresses (race_id)`);

    // Onchain events
    await queryRunner.query(`
      CREATE TABLE onchain_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        txid VARCHAR(64) NOT NULL,
        vout_index INTEGER,
        spark_address VARCHAR(160) NOT NULL,
        amount NUMERIC(18,8) NOT NULL,
        direction VARCHAR(3) NOT NULL CHECK (direction IN ('in', 'out')),
        purpose event_purpose,
        race_id UUID REFERENCES races(id),
        player_id UUID REFERENCES players(id),
        status event_status NOT NULL DEFAULT 'detected',
        instant_locked BOOLEAN NOT NULL DEFAULT FALSE,
        block_hash VARCHAR(64),
        block_height INTEGER,
        raw_tx JSONB,
        detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_onchain_txid_vout ON onchain_events (txid, vout_index)`);
    await queryRunner.query(`CREATE INDEX idx_onchain_race ON onchain_events (race_id)`);
    await queryRunner.query(`CREATE INDEX idx_onchain_status ON onchain_events (status)`);
    await queryRunner.query(`CREATE INDEX idx_onchain_address ON onchain_events (spark_address)`);

    // Backings
    await queryRunner.query(`
      CREATE TABLE backings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID NOT NULL REFERENCES races(id),
        racer_id UUID NOT NULL REFERENCES racers(id),
        player_id UUID REFERENCES players(id),
        onchain_event_id UUID NOT NULL REFERENCES onchain_events(id),
        amount NUMERIC(18,8) NOT NULL,
        pool_amount NUMERIC(18,8) NOT NULL,
        treasury_amount NUMERIC(18,8) NOT NULL,
        tick_received SMALLINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_backings_race_racer ON backings (race_id, racer_id)`);
    await queryRunner.query(`CREATE INDEX idx_backings_player ON backings (player_id)`);

    // Actions
    await queryRunner.query(`
      CREATE TABLE actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID NOT NULL REFERENCES races(id),
        racer_id UUID NOT NULL REFERENCES racers(id),
        player_id UUID REFERENCES players(id),
        onchain_event_id UUID NOT NULL REFERENCES onchain_events(id),
        action_type action_type NOT NULL,
        status action_status NOT NULL DEFAULT 'pending',
        cost NUMERIC(18,8) NOT NULL,
        pool_share NUMERIC(18,8) NOT NULL,
        treasury_share NUMERIC(18,8) NOT NULL,
        reserve_share NUMERIC(18,8) NOT NULL,
        applied_at_tick SMALLINT,
        effect_magnitude NUMERIC(8,4),
        diminishing_factor NUMERIC(6,4) DEFAULT 1.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_actions_race ON actions (race_id)`);
    await queryRunner.query(`CREATE INDEX idx_actions_race_player ON actions (race_id, player_id)`);

    // Tick snapshots
    await queryRunner.query(`
      CREATE TABLE tick_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID NOT NULL REFERENCES races(id),
        tick SMALLINT NOT NULL CHECK (tick BETWEEN 1 AND 24),
        block_hash VARCHAR(64) NOT NULL,
        random_seed VARCHAR(64) NOT NULL,
        racer_states JSONB NOT NULL,
        actions_applied JSONB NOT NULL DEFAULT '[]',
        commentary TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(race_id, tick)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_snapshots_race ON tick_snapshots (race_id)`);

    // Settlements
    await queryRunner.query(`
      CREATE TABLE settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID NOT NULL REFERENCES races(id) UNIQUE,
        status settlement_status NOT NULL DEFAULT 'pending',
        total_prize_pool NUMERIC(18,8) NOT NULL,
        total_treasury NUMERIC(18,8) NOT NULL,
        total_reserve NUMERIC(18,8) NOT NULL,
        first_place_pool NUMERIC(18,8) NOT NULL,
        second_place_pool NUMERIC(18,8) NOT NULL,
        third_place_pool NUMERIC(18,8) NOT NULL,
        payouts JSONB NOT NULL DEFAULT '[]',
        treasury_txid VARCHAR(64),
        reserve_txid VARCHAR(64),
        error_log TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Broadcast messages
    await queryRunner.query(`CREATE TYPE broadcast_channel AS ENUM ('websocket', 'telegram')`);
    await queryRunner.query(`CREATE TYPE broadcast_type AS ENUM ('race_starting', 'race_started', 'tick_update', 'action_applied', 'big_backing', 'race_finished', 'payouts_sent', 'chaos_event')`);
    await queryRunner.query(`
      CREATE TABLE broadcast_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        race_id UUID REFERENCES races(id),
        channel broadcast_channel NOT NULL,
        message_type broadcast_type NOT NULL,
        payload JSONB NOT NULL,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_broadcast_race ON broadcast_messages (race_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS broadcast_messages CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS settlements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tick_snapshots CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS actions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS backings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS onchain_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS race_addresses CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS racers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS races CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS browser_sessions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS players CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS broadcast_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS broadcast_channel`);
    await queryRunner.query(`DROP TYPE IF EXISTS settlement_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS event_purpose`);
    await queryRunner.query(`DROP TYPE IF EXISTS event_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS action_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS action_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS intent_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS archetype`);
    await queryRunner.query(`DROP TYPE IF EXISTS race_slot`);
    await queryRunner.query(`DROP TYPE IF EXISTS race_status`);
  }
}
