<img src="./assets/logo.png" align="left" title="CTI app logo" alt="App Logo" width="80px" height="80px">

# Order Viewer app

The Order Viewer app is a Zendesk app built to demo Zendesk order management capabilities using Sunshine Objects & Events. The app lets agents search through or sort orders, view order attributes, detail and events from the ticket sidebar. 

<p align="center">
    <img src="https://cl.ly/a6aec9d3c22c/Screen%252520Recording%2525202019-07-16%252520at%25252002.54%252520pm.gif" width="600px">
    <img src="https://cl.ly/8ee21faf9855/Screen%252520Recording%2525202019-07-16%252520at%25252002.56%252520pm.gif" width="250px">
</p>

## App location

* Ticket sidebar

## Features

* View list of orders related to the requester of the ticket
* Filter list of orders by searching for ID, date, source or type
* Sort list of orders by ID or creation date
* View order attributes
* View product SKUs related to a specific order
* View events related to a specific order

## Using the app

### Prerequisites

* You must be on Zendesk Enterprise plan to have access to Custom Objects
* The User Events API is currently in Early Access. To enable the EAP, go to Zendesk Support > Admin > Manage > Sunshine > Settings and enable Events & Profiles API
* You must be able to make API calls to create the object & relationship records See [Custom Objects Documentation](https://developer.zendesk.com/rest_api/docs/custom-objects-api/introduction) for more detail 

### Getting started
Follow the steps below prior to installing the app. Alternatively, you can use this [Postman Collection](https://github.com/zendesk/pa_apps/tree/master/Misc/Postman) to create the required resources. 

ℹ️ You can use your own custom keys for the object & relationship types, and specify them in the app settings. Otherwise, they will default to order, product, ordered, contains & used_in.


**1. Create 2 object types for your orders & your products ([example](https://cl.ly/1187aed75e4e))**
An object type is a blueprint for creating object records of the same type. You can create the types via API or through the Zendesk UI (Admin > Manage > Custom Objects). You can specify any number of properties for your object. All properties have to be of type **string**.

**2. Create the relationship types**
A relationship type defines a relationship between object records (1-to-1, 1-to-many, many-to-many).

1. Create a 1-to-many relationship type "ordered" with: source = zen:user / type = 1:many / target = order ([example](https://cl.ly/1ab0faba7727)).
2. Create a many-to-many relationship type by creating 2x 1-to-many relationship types:
    1. Relationship type "contains" with: source = order / type = 1:many / target = sku ([example](https://cl.ly/6be6d7c32ef4)).
    2. Relationship type "used_in" with: source = sku / type = 1:many / target = order ([example](https://cl.ly/51d7586081ba)).

**3. Create the object records** 
An Object record is a placeholder for the data you want to diplay. The data it can contain is defined by the object type that you choose. You need to use the API to create object records.

1. Create one or multiple **product** object record(s). ([example](https://cl.ly/5ba80d331f14)).
2. Create one or multiple **order** object record(s). Use external_id as the order name that will be displayed and searchable (mandatory). Underscores "_" will be replaced by spaces " ". Also, if status is found as part of the attributes, it will be promoted to header of the card (different colors apply to ) ([example](https://cl.ly/a8eaec45ecaf)).

ℹ️ Image URLs in attribute values will be rendered as images. Also, if "status" is found as part of the attributes, the value of the attribute will be promoted to the header of the card, and different colors will apply depending the value (completed/delivered/done = green, pending/waiting = yellow).

**4. Create the relationship records** 
Relationship records create associations between object records based on a pre-defined relationship type. You need to use the API to create relationship records.

1. Link one or multiple **product** records with an order record using the **contains** relationship type ([example](https://cl.ly/f7a77abf5eb4)).
2. Link one or multiple **order** records with a Zendesk user using the **ordered** relationship type ([example](https://cl.ly/d31540eb7cfe)).

**5. Create the events related to an order** 
Sunshine Events let you build a timeline of all your customers' interactions from any source. Here they are used to show order related events such as order placed/prepared/delivered. You need to use the API to create events.

1. Create custom events where source = **external_id** of the order you want the event to be linked to. 

### Settings
You can update the settings below with your custom object & relationship types keys:

* Object 1 name: The name of the object linked to the user (e.g: order). This should also be this object type's key
* Relationship type 1: The relationship type key between the user and the object 1
* Object 2 name: The name of the second object linked to the first object (e.g: product). This should also be this object type's key
* Relationship type 2: The relationship type key between object 1 and object 2

## Known Issues & Limitations
No known issues or limitations

### About the app

#### Understand the data model
![](https://cl.ly/31f354bfa02a/QuickDBD-Order_Management_App-Data_Model.png)

#### Understand the app's layout & data

**Sidebar App:**: order list

![](https://cl.ly/003ef3c79340/Screenshot%2525202019-02-27%252520at%25252016.39.10.png)

**Modal:** order detail & events

![](https://cl.ly/24ccc327add0/Screenshot%2525202019-02-27%252520at%25252017.03.06.png)
