#!/bin/bash
SECRETFILE="${HOME}/.facebook-secret.json"

which node
RV=$?
if [ ${RV} -ne 0 ]; then
	sudo apt-get update || exit 1
	sudo apt-get install nodejs || exit 1
fi
which jq
RV=$?
if [ ${RV} -ne 0 ]; then
	sudo apt-get update || exit 1
	sudo apt-get install jq || exit 1
fi
if [ ! -e node_modules ]; then
	npm install || exit 1
fi

if [ ! -e "${SECRETFILE}" ]; then
	echo "Please enter Facebook account data these will be stored in a file and used to login into stt."
	echo -n "e-mail or telephone number: "
	read EMAIL
	echo -n "password (no echo): "
	read -s PASSWORD
	touch "${SECRETFILE}"
	chmod o-rwx "${SECRETFILE}"
	chmod g-rwx "${SECRETFILE}"
	cat >"${SECRETFILE}" <<EOF
{
	"login": "${EMAIL}",
	"password": "${PASSWORD}"
}
EOF
fi

node index.js "${@}"
