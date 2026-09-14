{
    'name': 'Aivory Cerveau Chat',
    'version': '18.0.1.0.0',
    'category': 'Productivity',
    'summary': 'Embeds the Aivory Cerveau agent chat panel natively in the Odoo systray',
    'description': """
Aivory Cerveau Chat (scaffold)
===============================

Adds a systray icon that opens a Cerveau agent chat panel inside Odoo's own
web client, instead of a bolted-on iframe. See
docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md in the Aivory monorepo for the full
architecture and open questions.

This is a scaffold: the round trip (systray -> controller -> Cerveau
/webhook -> reply rendered) works, but tenant mapping is hardcoded, there is
no production auth hardening, and there is no streaming support yet.
""",
    'author': 'Aivory',
    'website': 'https://aivory.uk',
    'license': 'LGPL-3',
    'depends': ['base', 'web'],
    'data': [
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'aivory_cerveau_odoo/static/src/js/systray_icon.js',
            'aivory_cerveau_odoo/static/src/xml/systray_icon.xml',
        ],
    },
    'installable': True,
    'application': False,
}
