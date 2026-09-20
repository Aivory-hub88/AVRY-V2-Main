{
    'name': 'Aivory Chat',
    'version': '19.0.2.1.0',
    'category': 'Productivity',
    'summary': 'Aivory agents (Geno, Teo, Lex, ...) as mentionable bots in Discuss',
    'description': """
Aivory Chat
===========

Every Aivory agent you add under Settings > Aivory Agents (Geno, Teo, Lex,
Finn, Ofira, Aira) gets its own bot in Discuss with the same name and avatar
as in the Aivory dashboard: mention ``@Lex`` in any channel or open a 1-1
chat with it and that agent answers right in the thread (each agent keeps
its own history per channel).

Each agent goes through ``POST /api/v1/agent-api/message`` with its own
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
    'installable': True,
    'application': False,
}
