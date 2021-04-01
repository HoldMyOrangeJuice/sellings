FROM nginx:latest

COPY docker/nginx/uwsgi_params /app/uwsgi_params

COPY docker/dom21.nginx /etc/nginx/conf.d/dom21.conf
COPY ./main/static/js_src /srv/web/dom21/Sellings/static/js_src

#babel
WORKDIR /srv/web/dom21/Sellings/
COPY ./docker/babel/.babelrc .babelrc

RUN apt-get update && apt-get install build-essential -y

RUN export DEBIAN_FRONTEND=noninteractive
RUN apt -yq install npm
RUN npm init --yes

RUN npm i --save-dev @babel/cli @babel/core @babel/preset-env
RUN npm i --save-dev "@babel/plugin-proposal-class-properties"
RUN npm install -g browserify
RUN npm install --save-dev gensync
RUN npm install --save-dev @babel/plugin-transform-async-to-generator
RUN npm install -g npm-add-script
RUN npm install --save-dev @babel/plugin-transform-runtime
RUN mkdir -p /srv/web/dom21/Sellings/not_volume
RUN npmAddScript -k build -v "babel ./static/js_src/ -d ./compiled_js"
#RUN npmAddScript -k build_bundle -v "browserify ./static/js_src/ >> ./compiled_js/bundle.js"

RUN npm run build >> build.txt

