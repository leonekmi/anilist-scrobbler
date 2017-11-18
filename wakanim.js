/*
Get Metadata from an episode of Wakanim.tv with Anilist Scrobbler
(c) leonekmi 2017
*/

async function main() {
    var regex = /https:\/\/www.wakanim.tv\/fr\/v2\/catalogue\/episode\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/;

    var isLoggedIn = false;
    var ChromeProcessed = false;
    chrome.storage.local.get('access_token', function (items) {
        if (typeof items['access_token'] == 'undefined') {
            isLoggedIn = false;
            ChromeProcessed = true;
        } else {
            isLoggedIn = true;
            ChromeProcessed = true;
        }
        if (isLoggedIn == true) {
            if (regex.test(document.documentURI)) {
                var series_title = $('.episode_title').text();
                var episode_number = $('.episode_subtitle span span').text();
                var query = `
                query ($id: Int, $page: Int, $search: String) {
                  Page (page: $page) {
                    media (id: $id, search: $search, type: ANIME) {
                      id
                      format
                      duration
                      title {
                        romaji
                        english
                        native
                      }
                      genres
                    }
                  }
                }
                `;
                var variables = {
                    search: series_title,
                    page: 1
                };

                var url = 'https://graphql.anilist.co',
                    options = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            query: query,
                            variables: variables
                        })
                    };

                function handleResponse(response) {
                    var jsonresponse = response.json();
                    jsonresponse.then(function (result) {
                        $( '.border-list' ).prepend('<li class="border-list_item"><span class="border-list_title">Anilist Scrobbler</span><span id="anilist_scrobbler_notice" class="border-list_text">'+ chrome.i18n.getMessage("starting") +'</span></li>');
                        var choose = chooseAnime(result);
                        choose.then(function (data_choose) {
                            var anime_choose = data_choose[0];
                            var duration = data_choose[1];
                            var temp_response = getAnimeProgress(result.data.Page.media[anime_choose].id);
                            temp_response.then(function (data) {
                                var jsonresponse2 = data.json();
                                jsonresponse2.then(function (result2) {
                                    if (result2.data.Page.media[0].mediaListEntry == null) {
                                        $( '#anilist_scrobbler_notice' ).text('Anilist Scrobbler : '+ chrome.i18n.getMessage("scrobbling_in_not_in_al", [(duration / 4 * 3)]));
                                        setTimeout(scrobbleAnime, duration / 4 * 3 * 60 * 1000, result.data.Page.media[anime_choose].id, episode_number);
                                    } else {
                                        if (episode_number <= result2.data.Page.media[0].mediaListEntry.progress) {
                                            $( '#anilist_scrobbler_notice' ).text('Anilist Scrobbler : '+ chrome.i18n.getMessage("already_watched"));
                                        } else if (episode_number == result2.data.Page.media[0].mediaListEntry.progress + 1) {
                                            $( '#anilist_scrobbler_notice' ).text('Anilist Scrobbler : '+ chrome.i18n.getMessage("scrobbling_in_normal", [(duration / 4 * 3)]));
                                            setTimeout(scrobbleAnime, duration / 4 * 3 * 60 * 1000, result.data.Page.media[anime_choose].id, episode_number);
                                        } else if (episode_number >= result2.data.Page.media[0].mediaListEntry.progress + 1) {
                                            $( '#anilist_scrobbler_notice' ).text('Anilist Scrobbler : '+ chrome.i18n.getMessage("scrobbling_in_jumped", [(duration / 4 * 3)]));
                                            setTimeout(scrobbleAnime, duration / 4 * 3 * 60 * 1000, result.data.Page.media[anime_choose].id, episode_number);
                                        } else {
                                            console.error("Ehhhh....");
                                        };
                                    }
                                });
                            });
                        });
                    });
                };
                function handleError(e) {
                        console.error(e);
                        window.alert(chrome.i18n.getMessage("api_error"));
                };

                fetch(url, options).then(handleResponse)
                                   .catch(handleError);
            }
        }
    });
}

$( window ).on( "load", function() {
    chrome.storage.sync.get({
        ignore_wk: false
    }, function (items) {
        if (items.ignore_wk == false) {
            main();
        }
    });
});