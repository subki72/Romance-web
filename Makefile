.PHONY: install lint test verify run docker-build docker-up clean

install:
	npm ci

lint:
	npm run lint

test:
	npm test

verify:
	npm run verify:syntax && npm run lint && npm test

run:
	npm start

docker-build:
	docker build -t romance-web:latest .

docker-up:
	docker compose up --build

clean:
	rm -rf coverage node_modules uploads
