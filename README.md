# stttools

This contains tools for the game start trek timelines.

You need a facebook account and a web browser running the game to use the script.

The script calcbestshuttlemissions.py calculates the best missions and the best crew man to use for shuttle events.

## Steps
1.  First open all shuttle missions which should be considered by the script (do not start the shuttle, but use a transmission).

2. Start **google chrome** or chromium.

3. Press **SHIFT+CTRL+J** (open chrome dev tools).

4. Go to network in chrome dev tools.

5. Activate **preserve log**.

3. Open web site **https://stt.disruptorbeam.com** in web browser until you can play.

4. Enter **player?** in filter field (network register of chrome dev tools).

5. Click on network package found (player?lang=).

6. Click on register **response**.

7. Select all text (**CTRL + A**) and copy (**CTRL + C**). The text starts with *{"action":"update","player":{"id":*. This could be very slow (around 2 or 3 MiB).

8. Open a simple text editor and paste (**CTRL + V**). This could be very slow.

9. Save file using the name **player.json** in the directroy where calcbestshuttlemissions.py is located.

10. Run the script **calcbestshuttlemissions.py**. You need to have Python installed.

11. This will print the best 3 missions to be used and the best crew man for these missions.

## Problems
When the mission requires *command* **OR** *science*, it will only check the **first skill**; i.e. in this example *command*.
When the mission requires *commmand* **AND** *science*, it will check **both**. The missions with **AND** are normally better, so the bug for **OR** normally does not matter.
