import uuidv4 from 'uuid/v4';

//! Enum
//! A special type that defines a set of constants
//! Enums can be used as the type for a field (similar to scalar and custom objects types)
//! Values for the field must be one of the constants for the type

//! UserRole - standard, editor, Admin

//! type: User {
//! role: UserRole(standard, editor Admin)
//! }

const Mutation = {
    createUser(parent, args, { db }, info) {
        const emailTaken = db.users.some(
            user => user.email === args.data.email
        );

        if (emailTaken) {
            throw new Error('Email taken');
        }

        const user = {
            id: uuidv4(),
            ...args.data,
        };

        db.users.push(user);

        return user;
    },
    deleteUser(parent, args, { db }, info) {
        const userIndex = db.users.findIndex(user => user.id === args.id);

        if (userIndex === -1) {
            throw new Error('User not found');
        }

        const deletedUsers = db.users.splice(userIndex, 1);

        db.posts = db.posts.filter(post => {
            const match = post.author === args.id;

            if (match) {
                db.comments = db.comments.filter(
                    comment => comment.post !== post.id
                );
            }

            return !match;
        });
        db.comments = db.comments.filter(comment => comment.author !== args.id);

        return deletedUsers[0];
    },
    updateUser(parent, args, { db }, info) {
        const { id, data } = args;
        const user = db.users.find(user => user.id === id);

        if (!user) {
            throw new Error('No such user exists');
        }
        if (typeof data.email === 'string') {
            const emailTaken = db.users.some(user => user.email === data.email);

            if (emailTaken) {
                throw new Error('Email already in use');
            }

            user.email = data.email;
        }

        if (typeof data.name === 'string') {
            user.name = data.name;
        }

        if (typeof data.age !== 'undefined') {
            user.age = data.age;
        }
        return user;
    },
    createPost(parent, args, { db, pubsub }, info) {
        const userExists = db.users.some(user => user.id === args.data.author);

        if (!userExists) {
            throw new Error('User not found');
        }

        const post = {
            id: uuidv4(),
            ...args.data,
        };

        db.posts.push(post);

        if (args.data.isPublished) {
            pubsub.publish('post', {
                post: {
                    mutation: 'CREATED',
                    data: post,
                },
            });
        }

        return post;
    },
    deletePost(parent, args, { db, pubsub }, info) {
        const postIndex = db.posts.findIndex(post => post.id === args.id);

        if (postIndex === -1) {
            throw new Error('No post was found');
        }

        const [post] = db.posts.splice(postIndex, 1);

        db.comments = db.comments.filter(comment => comment.post !== args.id);

        if (post.isPublished) {
            pubsub.publish('post', {
                post: {
                    mutation: 'DELETED',
                    data: post,
                },
            });
        }

        return post;
    },
    updatePost(parent, args, { db, pubsub }, info) {
        const { id, data } = args;
        const post = db.posts.find(post => post.id === id);
        const orginalPost = { ...post };

        if (!post) {
            throw new Error('No such post exists');
        }

        if (typeof data.title === 'string') {
            post.title = data.title;
        }

        if (typeof data.body === 'string') {
            post.body = data.body;
        }

        if (typeof data.isPublished === 'boolean') {
            post.isPublished = data.isPublished;
            //! Is the orginal published AND now UNpublished
            if (orginalPost.isPublished && !post.isPublished) {
                //! DELETE
                pubsub.publish('post', {
                    post: {
                        mutation: 'DELETED',
                        data: orginalPost,
                    },
                });
            } else if (!orginalPost.isPublished && post.isPublished) {
                //! CREATED
                pubsub.publish('post', {
                    post: {
                        mutation: 'CREATED',
                        data: post,
                    },
                });
            }
        } else if (post.isPublished) {
            //! UPDATE
            pubsub.publish('post', {
                post: {
                    mutation: 'UPDATED',
                    data: post,
                },
            });
        }

        return post;
    },

    createComment(parent, args, { db, pubsub }, info) {
        const userExists = db.users.some(user => user.id === args.data.author);
        const postExists = db.posts.some(
            post => post.id === args.data.post && post.isPublished
        );

        if (!userExists || !postExists) {
            throw new Error('Unable to find user and post');
        }

        const comment = {
            id: uuidv4(),
            ...args.data,
        };

        db.comments.push(comment);
        pubsub.publish(`comment ${args.data.post}`, {
            comment: {
                mutation: 'CREATED',
                data: comment,
            },
        });

        return comment;
    },
    deleteComment(parent, args, { db, pubsub }, info) {
        //! Does that comment exist check?!
        const commentIndex = db.comments.findIndex(
            comment => comment.id === args.id
        );

        if (commentIndex === -1) {
            throw new Error('No comment was found');
        }

        const [deletedComment] = db.comments.splice(commentIndex, 1);

        pubsub.publish(`comment ${deletedComment.post}`, {
            comment: {
                mutation: 'DELETED',
                data: deletedComment,
            },
        });

        return deletedComment;
    },
    updateComment(parent, args, { db }, info) {
        const { id, data } = args;
        const comment = db.comments.find(comment => comment.id === id);

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (typeof data.text === 'string') {
            comment.text = data.text;
        }

        return comment;
    },
};

export { Mutation as default };
