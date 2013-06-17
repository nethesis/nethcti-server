#!/usr/bin/env node
// Main application that starts all architect modules

var architect = require('architect');

try{
    // architect components
    var config = [
        { packagePath: "./plugins/logger"                  },
        { packagePath: "./plugins/user"                    },
        { packagePath: "./plugins/authorization"           },
        { packagePath: "./plugins/authentication"          },
        { packagePath: "./plugins/dbconn"                  },
        { packagePath: "./plugins/ast_proxy"               },
        { packagePath: "./plugins/postit"                  },
        { packagePath: "./plugins/history"                 },
        { packagePath: "./plugins/phonebook"               },
        { packagePath: "./plugins/operator"                },
        { packagePath: "./plugins/caller_note"             },
        { packagePath: "./plugins/config_manager"          },
        { packagePath: "./plugins/customer_card"           },
        { packagePath: "./plugins/com_authe_rest"          },
        { packagePath: "./plugins/com_postit_rest"         },
        { packagePath: "./plugins/com_history_rest"        },
        { packagePath: "./plugins/com_phonebook_rest"      },
        { packagePath: "./plugins/com_caller_note_rest"    },
        { packagePath: "./plugins/com_customer_card_rest"  },
        { packagePath: "./plugins/com_config_manager_rest" },
        { packagePath: "./plugins/com_nethcti_ws"          },
        { packagePath: "./plugins/http_proxy"              }
    ];

    var app = architect.resolveConfig(config, __dirname);

    architect.createApp(app, function (resp) {
        console.log('nethcti architect app created');
    });

    process.on('uncaughtException', function (err) {
        console.log('UncaughtException !!!');
        console.log(err.stack);
    });

} catch (err) {
    console.log(err.stack);
}
