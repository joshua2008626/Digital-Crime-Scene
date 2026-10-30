"""initial schema

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

TS = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.create_table(
        "guests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(40), nullable=False, server_default=""),
        sa.Column("xp", sa.Integer, nullable=False, server_default="0"),
        sa.Column("extras", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("updated_at", TS, nullable=False),
    )
    op.create_table(
        "investigation_sessions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("guest_id", sa.String(36), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("client_id", sa.String(80), nullable=False),
        sa.Column("case_id", sa.String(60), nullable=False),
        sa.Column("attempt", sa.Integer, nullable=False, server_default="1"),
        sa.Column("mode", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("elapsed_sec", sa.Integer, nullable=False, server_default="0"),
        sa.Column("started_at", sa.String(40), nullable=False),
        sa.Column("updated_at", sa.String(40), nullable=False),
        sa.Column("extra", sa.JSON, nullable=False, server_default="{}"),
        sa.UniqueConstraint("guest_id", "client_id", name="uq_session_client"),
    )
    sid = lambda: sa.Column("session_id", sa.Integer, sa.ForeignKey("investigation_sessions.id", ondelete="CASCADE"), nullable=False, index=True)  # noqa: E731
    op.create_table("collected_evidence", sa.Column("id", sa.Integer, primary_key=True, autoincrement=True), sid(), sa.Column("evidence_id", sa.String(40), nullable=False), sa.Column("inspected_only", sa.Integer, nullable=False, server_default="0"))
    op.create_table("notes", sa.Column("id", sa.Integer, primary_key=True, autoincrement=True), sid(), sa.Column("client_id", sa.String(80), nullable=False), sa.Column("text", sa.Text, nullable=False), sa.Column("evidence_id", sa.String(40)), sa.Column("created_at", sa.String(40), nullable=False))
    op.create_table("graph_snapshots", sa.Column("session_id", sa.Integer, sa.ForeignKey("investigation_sessions.id", ondelete="CASCADE"), primary_key=True), sa.Column("data", sa.JSON, nullable=False))
    op.create_table("verdicts", sa.Column("session_id", sa.Integer, sa.ForeignKey("investigation_sessions.id", ondelete="CASCADE"), primary_key=True), sa.Column("verdict_id", sa.String(60), nullable=False, server_default=""), sa.Column("confidence", sa.Integer, nullable=False, server_default="50"), sa.Column("draft", sa.JSON, nullable=False))
    op.create_table("reports", sa.Column("id", sa.Integer, primary_key=True, autoincrement=True), sid(), sa.Column("client_id", sa.String(80), nullable=False), sa.Column("score", sa.Integer, nullable=False), sa.Column("grade", sa.String(4), nullable=False), sa.Column("xp_earned", sa.Integer, nullable=False, server_default="0"), sa.Column("data", sa.JSON, nullable=False))
    op.create_table("achievements", sa.Column("id", sa.Integer, primary_key=True, autoincrement=True), sa.Column("guest_id", sa.String(36), sa.ForeignKey("guests.id", ondelete="CASCADE"), nullable=False, index=True), sa.Column("achievement_id", sa.String(40), nullable=False), sa.Column("unlocked_at", sa.String(40), nullable=False), sa.UniqueConstraint("guest_id", "achievement_id", name="uq_guest_achievement"))
    op.create_table("hint_requests", sa.Column("id", sa.Integer, primary_key=True, autoincrement=True), sid(), sa.Column("hint_id", sa.String(60), nullable=False), sa.Column("at", sa.String(40), nullable=False))


def downgrade() -> None:
    for t in ("hint_requests", "achievements", "reports", "verdicts", "graph_snapshots", "notes", "collected_evidence", "investigation_sessions", "guests"):
        op.drop_table(t)
