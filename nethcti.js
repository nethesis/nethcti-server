#!/usr/bin/env node
// Main application that starts all architect modules

var architect = require('architect');

try{
    // architect components
    var config = [
        { packagePath: "./plugins/logger"                  },
        { packagePath: "./plugins/util"                    },
        { packagePath: "./plugins/user"                    },
        { packagePath: "./plugins/authorization"           },
        { packagePath: "./plugins/authentication"          },
        { packagePath: "./plugins/dbconn"                  },
        { packagePath: "./plugins/mailer"                  },
        { packagePath: "./plugins/sms"                     },
        { packagePath: "./plugins/cel"                     },
        { packagePath: "./plugins/ast_proxy"               },
        { packagePath: "./plugins/postit"                  },
        { packagePath: "./plugins/history"                 },
        { packagePath: "./plugins/phonebook"               },
        { packagePath: "./plugins/operator"                },
        { packagePath: "./plugins/streaming"               },
        { packagePath: "./plugins/voicemail"               },
        { packagePath: "./plugins/caller_note"             },
        { packagePath: "./plugins/config_manager"          },
        { packagePath: "./plugins/customer_card"           },
        { packagePath: "./plugins/notification_manager"    },
        { packagePath: "./plugins/com_static_http"         },
        { packagePath: "./plugins/com_authentication_rest" },
        { packagePath: "./plugins/com_sms_rest"            },
        { packagePath: "./plugins/com_postit_rest"         },
        { packagePath: "./plugins/com_history_rest"        },
        { packagePath: "./plugins/com_phonebook_rest"      },
        { packagePath: "./plugins/com_streaming_rest"      },
        { packagePath: "./plugins/com_ast_proxy_rest"      },
        { packagePath: "./plugins/com_voicemail_rest"      },
        { packagePath: "./plugins/com_caller_note_rest"    },
        { packagePath: "./plugins/com_authorization_rest"  },
        { packagePath: "./plugins/com_customer_card_rest"  },
        { packagePath: "./plugins/com_config_manager_rest" },
        { packagePath: "./plugins/com_nethcti_ws"          },
        { packagePath: "./plugins/http_proxy"              }
    ];

    var app = architect.resolveConfig(config, __dirname);

    architect.createApp(app, function (resp) {
        console.log('cti architect app created');
    });

    process.on('uncaughtException', function (err) {
        console.log('UncaughtException !!!');
        console.log(err.stack);
    });

} catch (err) {
    console.log(err.stack);
}
