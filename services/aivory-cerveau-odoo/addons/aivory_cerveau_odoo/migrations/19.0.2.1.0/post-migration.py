"""The systray widget is gone; drop the API key it stored (a secret) so it does
not linger in system parameters. Agent keys live on ``aivory.agent`` now."""


def migrate(cr, version):
    cr.execute("DELETE FROM ir_config_parameter WHERE key = 'aivory_cerveau.api_key'")
