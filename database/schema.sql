CREATE TABLE direct_chats (
  id BIGSERIAL NOT NULL,
  license_id INT NOT NULL,
  user_a_id VARCHAR(255) NOT NULL,
  user_b_id VARCHAR(255) NOT NULL,
  seen_till_message_id_a INT NULL,
  seen_till_message_id_b INT NULL,
  last_message_id INT NULL,
  last_message_text TEXT NULL,
  last_message_author_id VARCHAR(255) NULL,
  last_message_ts BIGINT NULL,
  ts BIGINT,
  PRIMARY KEY (id),
  CONSTRAINT direct_chats_1 UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE direct_messages (
  id BIGSERIAL NOT NULL,
  chat_id BIGINT NOT NULL,
  license_id BIGINT NOT NULL,
  random_id BIGINT NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  text TEXT,
  ts BIGINT,
  CONSTRAINT direct_messages_1 UNIQUE (license_id, chat_id, id),
  CONSTRAINT direct_messages_2 UNIQUE (license_id, chat_id, random_id)
);

CREATE TABLE direct_statuses (
  license_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  status TEXT,
  updated_at BIGINT,
  CONSTRAINT direct_statuses_1 UNIQUE (license_id, user_id)
);
