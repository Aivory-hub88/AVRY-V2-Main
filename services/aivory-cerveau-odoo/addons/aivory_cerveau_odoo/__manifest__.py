{
    'name': 'Aivory Chat',
    'version': '19.0.2.0.0',
    'category': 'Productivity',
    'summary': 'Aivory agent in the Odoo systray and natively in Discuss',
    'description': """
Aivory Chat
===========

Two surfaces, one agent:

* A systray icon that opens an Aivory agent chat panel inside Odoo's own
  web client, instead of a bolted-on iframe.
* Every Aivory agent you add under Settings > Aivory Agents (Geno, Teo, Lex,
  Finn, Ofira, Aira) gets its own bot in Discuss with the same name and avatar
  as in the Aivory dashboard: mention ``@Lex`` in any channel or open a 1-1
  chat with it and that agent answers right in the thread (each agent keeps
  its own history per channel).

Both go through ``POST /api/v1/agent-api/message`` with a per-tenant
``X-Aivory-Api-Key`` -- the addon never holds Cerveau's shared webhook
secret. See docs/CERVEAU-ODOO-UI-WIDGET-PLAN.md in the Aivory monorepo.
""",
    'author': 'Aivory',
    'website': 'https://aivory.uk',
    'license': 'LGPL-3',
    'depends': ['base', 'web', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'views/aivory_agent_views.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'aivory_cerveau_odoo/static/src/js/systray_icon.js',
            'aivory_cerveau_odoo/static/src/xml/systray_icon.xml',
            'aivory_cerveau_odoo/static/src/scss/systray_panel.scss',
        ],
    },
    'installable': True,
    'application': False,
}
