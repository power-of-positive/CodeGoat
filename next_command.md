1. run all of the tests and quality checks we have and fix any existing issues
2. add functionality to delete the worker and the worktree
3. add functionality to start dev server with the worker's worktree
4. make task logs element in UI ful llength - to see longer logs
5. add button on merge to auto generate a merge commit based on Diffs and task descriptionit
6. in worker detail the log file name does not break properly and overflows over neighboring task logs section
7. the menu button background is transparent - it shouldn't be
8. the menu button icons are way too small both open and collapse menu
9. validations button should be in worker details page and show the validation runs there instead of the workers list page

10. collapsing menu doesn't move the content - the page doesn't take more space
11. in validation page, clicking on "view details" in recent validation runs section takes to a new page but fails to load the page
12. stage history and performance analytics fails to load the data
13. test permissions functionality from permissions page to make sure it actually blocks the worker from executing unsafe commands - perhaps add permission forbidding editing a dummy file and ask it to edit it to see if it succeeds or fails
14. there should be option to set number of retries so that if validation fails it re-triggers the agent with the validation run feedback
15. the loading time should be shorter when the page fails to load data
16. update the validation run of you own to see if it executes all of the quality gates - I don't think it does now. - so that you wouldn't stop if any of the stages fail - including for example e2e tests.
17. make sure that task duration is calculated dynamically from start and end datetime
18. i would like to see diff viewer in worker details
19. delete the past dummy data that is in the DB - keeping only CODEGOAT-18 and higher
20. remove the current contents of the settings page and the page itself
21. will need to wrap this application in electron to make it an installable application
22. review database schema
23. inspect all our docs, make sure they're up to date, useful and indeed following them results in what they claim - we will be onboarding interns and I want to avoid unnecessary confusion with irrelevant and inaccurate information for each of the documents check all of the claims and information made
24. put the start dev server functionality on the task detail and task in the kanban page
