# LiveChat Direct

Private chats between agents in LiveChat

## Install on Heroku

1. Push code on heroku:
   1. `heroku create -a example-app`
   2. `heroku git:remote -a example-app`
   3. `heroku addons:create heroku-postgresql:mini -a example-app`
   4. `heroku pg:psql --app app_name < database/schema.sql`
2. Open [LiveChat Developer Console](https://developers.livechat.com/console/) and create new app
3. Add autorization block with `agents--all:ro` scope; set `Client ID` in heroku
   1.  `heroku config:set DIRECT_CLIENT_ID=abcd...`
4. Add Agent App Widgets (full screen location) with following Widget source URL:
   1. `https://example-app.herokuapp.com/direct` (also can be directly opened in browser)
5. On LiveChat Developer console, go to `Private Installation` section and install the app
6. Open http://my.livechatinc.com and you should have an app on left menu
