import { GraphQLServer, PubSub } from 'graphql-yoga';

import db from './db';
import Query from './resolvers/Query';
import Mutation from './resolvers/Mutation';
import Subscription from './resolvers/Subscription';
import User from './resolvers/User';
import Post from './resolvers/Post';
import Comment from './resolvers/Comment';

const pubsub = new PubSub();

const server = new GraphQLServer({
    typeDefs: './src/schema.graphql',
    resolvers: {
        //! Using shorthand syntax since the property is equal to the variable
        Query,
        Mutation,
        Subscription,
        User,
        Post,
        Comment,
    },
    //! set up db to be ctx for all resolvers regardless where they are in the root! Nice! Shared values!
    context: {
        db,
        pubsub,
    },
});
server.start(() => {
    const localhost = 'http://localhost:4000/';
    console.log(`Server is running on ${localhost}`);
});
