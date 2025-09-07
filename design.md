# Container Management Service
## Tech Stack
- nextjs for front end services
- nestjs for back-end services
- nodejs
- typescript
- monorepo for three different services/apps

## Services / Apps
1. Client Web App ('ClientApp')
2. Container Gateway ('ContainerGw')
3. App Container ('AppContainer')

## Client Web App
This app's name is 'ClientApp'.  it is a single page web app that the client browswer will connect to to build and run apps

### Client Weg App Tech stack
- front end gui
- nextjs with typescript
- single page app
- uses app router
- uses turbopack
- uses eslint

### Client Web App Requirements
- single page web app
- three windows on page:
  1. Message window for various messages to the user
  2. Terminal IO window to see commands that are running in the remote docker container's shell
  3. Preview window, which is an embedded browswer window that connects to the web app running on the remote docker container
- ClientApp will call ContainerGw service via api calls to set up and interact with dynamic docker containers that the ContainerGw will manage.
- ClientApp will interact with dynamic docker containers through a web socket that the ContainerGw service will set up when first creating a new docker container.
- ClientApp will be able to make the following requests to the ContainerGw service via api calls:
   1. create AppContainer:  
      1. ContainerGw creates a new docker container based on a nodejs alpine image
      2. ContainerGw will then allocate an AppContainer ID and then create a web socket that the AppContainer and ClientApp can use to interact with each other
      3. ContainerGw will respond to the ClientApp with the AppContainer ID and websocket to the ClientApp
   2. terminate AppContainer
      1. ContainerGw will stop and delete the respective AppContainer docker container
      2. ContainerGw will respond to ClientApp with a success status flag to let it know that the deletion was complete.
   3. query status of an AppContainer:  running, stopped, terminated, deleted
- once the web socket is established, the ClientApp will be able to send files directly to the AppContainer with a full path specified for the location of the file in the AppContainer file system.
- once the web socket is established, all terminal IO for the shell running in the AppContainer will be displayed in the terminal IO window of the single page app.  A user can also type commands into the terminal io window and those commands will be sent and executed in the AppContainer shell.
- the ClientApp can send over source code files zipped in a single zip file to the AppContainer.  If this happens, the AppContainer will unzip them to the root path of it's file system specified by the ClientApp
- at some point, ClientApp will tell the AppContainer to build it's own web app with that source code and then run it.  It will be hosted on a specific http port for the ClientApp to browse.
- once the AppContainer's own web app is running, the ClientApp will be able to render the html from that shared port in it's preview window of the single page app just like an embedded browser.

## Container Gateway
### Container Gateway Requirements
The ContainerGw service will act like an api gateway to multiple ClientApp services that might be running.  The ClientApp services will make API calls to the container gateway to:
1. create a new docker container
   1. create the docker container based on a nodejs alpine image
   2. install npm and possibly some other tools
   3. construct a web socket that the AppContainer and the ClientApp can then use to communicate directly with each other
2. delete the docker container and tear down the web socket when the ClientApp is finished and requests the container gateway to do so.
3. Possibly some more api commands in the future

### Container Gateway Tech Stack
- api gateway using nestjs, typescript, nodejs
- can be scaled in the future with the addition of a load balancer
- should use eslint

## App Container
The app container is a container that the container gateway will create when asked to do so by a ClientApp.
The app container will be based on a nodejs alpine image.
When the container gateway first creates it, the container gateway will also set up a web socket for the app container to use to interact directly with the ClientApp going forward.
The ClientApp will send files to the AppContainer at some point.  The AppContainer will save those in it's file sytem.
The ClientApp may also send a zip file containing multiple files at any time.  When it does, the AppContainer should unzip them using the specified file paths.
The ClientApp may also send the AppContainer shell commands to execute.  The ClientApp will send them as terminal io.  Terminal output should be sent back to the ClientApp so that it feels like the ClientApp has an ssh session with the shell of the AppContainer.
At some point, the ClientApp will ask the AppContainer to build it's own web app locally within the AppContainer and host it on an http port (eg. port 3000).  The ClientApp will then be able to browse the hosted html on that port over the web socket remotely.

