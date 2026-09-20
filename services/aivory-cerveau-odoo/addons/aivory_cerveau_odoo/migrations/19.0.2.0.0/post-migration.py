"""The single generic "Aivory" Discuss bot (one global key) is replaced by one
bot per agent persona. Retire the old one so it does not linger in @-mentions
as a bot that never answers.

Plain SQL on purpose: during a module upgrade the ORM refuses to archive a
partner whose user still reads as active, even right after archiving the user."""


def migrate(cr, version):
    cr.execute("""
        WITH archived AS (
            UPDATE res_users SET active = FALSE WHERE login = 'aivory' RETURNING partner_id
        )
        UPDATE res_partner SET active = FALSE WHERE id IN (SELECT partner_id FROM archived)
    """)
