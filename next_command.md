1. run all of the tests and quality checks we have and fix any existing issues
2. add functionality to delete the worker and the worktree
3. add functionality to start dev server with the worker's worktree
4. make task logs element in UI ful llength - to see longer logs
5. add button on merge to auto generate a merge commit based on Diffs and task descriptionit
6. in worker detail the log file name does not break properly and overflows over neighboring task logs section
7. the menu button background is transparent - it shouldn't be
8. the menu button icons are way too small both open and collapse menu
9. validations button should be in worker details page and show the validation runs there instead of the workers list page
10. the worker created modal redirects to http://localhost:5173/workers/undefined
11. in validation page, clicking on "view details" in recent validation runs section takes to a new page but fails to load the page
12. stage history and performance analytics fails to load the data
13. test permissions functionality from permissions page to make sure it actually blocks the worker from executing unsafe commands - perhaps add permission forbidding editing a dummy file and ask it to edit it to see if it succeeds or fails
14. there should be option to set number of retries so that if validation fails it re-triggers the agent with the validation run feedback
15. the loading time should be shorter when the page fails to load data
16. update the validation run of you own to see if it executes all of the quality gates - I don't think it does now. - so that you wouldn't stop if any of the stages fail - including for example e2e tests.
17. commit the changes we have so far
18. i would like to see diff viewer in worker details
19. delete the past dummy data that is in the DB
