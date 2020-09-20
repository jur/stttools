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

get_browser()
{
	wget -q -O - "http://127.0.0.1:9222/json/version" | jq -r .Browser
}

# Test if google chrome is running
pidof chrome >/dev/null
RV=$?
if [ ${RV} -eq 0 ]; then
	BROWSER="$(get_browser)"
else
	google-chrome --remote-debugging-port=9222 &
	sleep 2s
	BROWSER="$(get_browser)"
fi
if [ "${BROWSER}" != "" ]; then
	# Need to start an own instance of chromium
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
fi

node index.js "${@}"
