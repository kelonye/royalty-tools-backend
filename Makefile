web:
	@DEBUG=backend:* ./node_modules/.bin/env-cmd ./node_modules/.bin/nodemon --watch 'src/**/*.ts' --exec './node_modules/.bin/ts-node' bin/$@.ts

cron:
	@DEBUG=backend:* ./node_modules/.bin/env-cmd ./node_modules/.bin/ts-node bin/$@.ts

sync:
	@DEBUG=backend:* ./node_modules/.bin/env-cmd ./node_modules/.bin/ts-node bin/$@.ts

.PHONY: web cron sync