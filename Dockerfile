FROM node:current-alpine

ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /ncnc-scripts

ARG GITHUB_PAT
ENV NODE_ENV=production

COPY . .
COPY npmrc .npmrc

RUN yarn
RUN yarn build
RUN rm -rf .npmrc

ENTRYPOINT [ "yarn", "program" ]