export interface UserResponse {
  data: {
    user: User;
  };
}

export interface User {
  id: string;
}
