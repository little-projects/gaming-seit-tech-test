APP_IMAGE=ngr05/sbg-gaming-seit-tech-test:latest
APP_RUNNING_PORT=4000

start:
# Task 1, start the application
# run against localhost:4000
# name the app sbg-tech-test-app
	docker start sbg-tech-test-app || docker run --publish $(APP_RUNNING_PORT):$(APP_RUNNING_PORT) -d --name sbg-tech-test-app $(APP_IMAGE)

launch: start
	open http://localhost:4000/graphql

stop:
	docker stop sbg-tech-test-app
	docker rm sbg-tech-test-app

restart: stop start
	echo Restarting

logs:
	docker logs -f sbg-tech-test-app

test: start
# Task 2 & 3 can be run with this command
	docker run -w /sbg-tech-test-app -v `pwd`:/sbg-tech-test-app node:14-alpine \
	npm install && npm test

check:
	npx prettier --check .

format:
	npx prettier --write .