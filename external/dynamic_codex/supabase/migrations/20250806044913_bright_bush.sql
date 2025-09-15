/*
  # Create messages table for Telegram bot

  1. New Tables
    - `messages`
      - `id` (serial, primary key)
      - `user_id` (bigint) - Telegram user ID
      - `username` (text) - Telegram username
      - `text` (text) - Message content
      - `date` (timestamptz) - Message timestamp
      - `created_at` (timestamptz) - Record creation time

  2. Security
    - Enable RLS on `messages` table
    - Add policy for service role access (needed for edge function)

  3. Changes
    - Added created_at field for better record tracking
    - Added RLS policies for secure access
*/

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  user_id bigint NOT NULL,
  username text,
  text text,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert messages (for the edge function)
CREATE POLICY "Service role can insert messages"
  ON messages
  FOR INSERT
  TO service_role
  USING (true);

-- Allow authenticated users to read all messages (for admin dashboard)
CREATE POLICY "Authenticated users can read messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);