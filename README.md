# [MIMUW-TT-MB] Time Tracking README

This VS Code plugin gathers data for the Master's thesis by Mateusz Bajorek. The data is anonymous with the secure identifier `UUID v4` used for consistent data storage. There are gathered statistics of added and deleted characters arranged in buckets of (at most) 30 seconds. Using the command `[MIMUW-MB-TT] Open Time Tracking dashboard` (from VS Code's `Command Palette` accessible with the `Crtl+Shift+P` shortcut) allows to see the dashboard with available data visualizations and user actions.

## Data type
There is presented the data format of one aforementioned bucket. The data is saved in files in the `JSON Lines` format where each line with a `JSON` object relates to one bucket.

![Data type structure](https://github.com/goalon/time-tracking/blob/main/docs/data-type.png)

Let me describe each of the fields of the above structure:
* `additions` say how many characters (chars) were added to the files opened in the editor within the time-frame determined by the fields start and end;
* `deletions` say analogously to the additions field about the deleted chars;
* `actions` count how many actions were done on each file opened in the editor (one action may add or delete multiple chars);
* `start` means the start of the interval during which the record of the data was gathered;
* `end` is analogously to the start field the end of the interval;
* `workspaceNameHash` is the SHA256 hash of the workspace name in VSCode. It is done to secure the privacy of the research participants in the well established way (not to leak these names), but simultaneously to still be able to differentiate between the project names. If the workspace name does not exist, the value of `workspaceNameHash` is the
string literal `"null"`;
* `languages` is a dictionary that stores data separately for each (automatically recognized by VS Code) programming language. It basically splits the fields `additions`, `deletions` and `actions` into contributions from each detected language.

## Live view
It is the first view visible after opening the dashboard. Hovering over a datapoint in the graph enables the user to view the number of additions/deletions which occured in the timespan between the chosen datapoint and the previous one.

![Live view](https://github.com/goalon/time-tracking/blob/main/docs/live-view.png)

## Calendar view
It is important to note that clicking on a day in the calendar opens the `day view` (if the data for the selected day exists).

![Calendar view](https://github.com/goalon/time-tracking/blob/main/docs/calendar-view.png)

## Day view
![Day view](https://github.com/goalon/time-tracking/blob/main/docs/day-view.png)

## Data flow overview
![Data flow overview](https://github.com/goalon/time-tracking/blob/main/docs/coding-process-tracker.png)

## Notable dependencies
* [Luxon](https://moment.github.io/luxon/)
* [Chart.js](https://www.chartjs.org/)
* [FullCalendar](https://fullcalendar.io/)
* [Nunjucks](https://mozilla.github.io/nunjucks/)
