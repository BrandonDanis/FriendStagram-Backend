SERVICE = backend
MOD_BIN = ./node_modules/.bin
MOCHA = $(MOD_BIN)/_mocha
STANDARD = $(MOD_BIN)/standard

tests:
	$(MAKE) lint
	$(MOCHA) --timeout 5000

test-fast:
	$(MOCHA) --timeout 5000

lint:
	$(STANDARD)

build:
	sudo docker build -t friendstagram/$(SERVICE) .

run:
	sudo docker-compose -f docker-compose.yml up -d friendstagram

restart:
	make build
	sudo docker-compose -f docker-compose.yml up --build -d friendstagram
