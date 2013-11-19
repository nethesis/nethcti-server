/**
* Provides the adapter from the database results to a uniform
* voicemail data.
*
* @class voicemail_from_db_adapter.js
* @static
*/

/**
* Adapts the voicemail data as received from the database in a uniform format.
*
* **It can throw an Exception.**
*
* @method adaptVoicemailData
* @param  {object} data The voice message data as received from the database
*   @param  {object} data.id       The voicemail identifier in the database
*   @param  {object} data.callerid The caller identifier of the voice message
*   @param  {object} data.origtime The creation timestamp of the voice message
*   @param  {object} data.duration The duration of the voice message in seconds
* @return {object} The voicemail data in a uniform format.
*/
function adaptVoicemailData(data) {
    try {
        // check parameter
        if (   typeof data          !== 'object'
            || typeof data.id       !== 'number'
            || typeof data.origtime !== 'number'
            || typeof data.callerid !== 'string'
            || typeof data.duration !== 'string') {

            throw new Error('wrong parameter');
        }

        return {
            id:                data.id,
            caller:            data.callerid,
            duration:          data.duration,
            creationTimestamp: data.origtime
        };

    } catch (err) {
       throw err;
    }
}

// public interface
exports.adaptVoicemailData = adaptVoicemailData;
